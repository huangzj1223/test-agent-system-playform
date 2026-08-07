"""Risk classification, approvals, and audit records for agent execution."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_run import AgentRun
from app.services.agent_execution_service import collect_agent_artifacts
from app.utils.exceptions import ConflictException, NotFoundException


AGENT_RUN_TRANSITIONS = {
    "pending_approval": {"running", "cancelled"},
    "running": {"succeeded", "failed", "cancelled"},
    "succeeded": set(),
    "failed": set(),
    "cancelled": set(),
}
BROWSER_AGENTS = {"web_cli", "web_mcp"}
BLOCKED_MARKERS = (
    "rm -rf",
    "format c:",
    "shutdown /",
    "drop database",
    "drop table",
    "truncate table",
    "delete all production",
    "\u6e05\u7a7a\u6570\u636e\u5e93",
    "\u5220\u9664\u751f\u4ea7\u6570\u636e",
)
DESTRUCTIVE_MARKERS = (
    "delete ",
    "remove ",
    "overwrite ",
    "submit ",
    "upload ",
    "\u5220\u9664",
    "\u6e05\u7a7a",
    "\u8986\u76d6",
    "\u63d0\u4ea4",
    "\u4e0a\u4f20",
)


class AgentRunStateError(ValueError):
    """Raised when an agent run attempts an invalid state transition."""


def classify_agent_risk(agent_name: str, prompt: str) -> str:
    normalized = prompt.casefold()
    if any(marker in normalized for marker in BLOCKED_MARKERS):
        return "L4"
    if any(marker in normalized for marker in DESTRUCTIVE_MARKERS):
        return "L3"
    if agent_name in BROWSER_AGENTS:
        return "L2"
    return "L1"


def ensure_agent_run_transition(current: str, target: str) -> None:
    if target not in AGENT_RUN_TRANSITIONS.get(current, set()):
        raise AgentRunStateError(f"invalid agent run transition: {current} -> {target}")


class AgentRunService:
    """Owns user-scoped agent run state and durable audit data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def prepare_run(
        self,
        *,
        user_id: UUID,
        conversation_id: UUID | None,
        skill,
        agent_name: str,
        prompt: str,
        context: dict,
    ) -> AgentRun:
        risk_level = classify_agent_risk(agent_name, prompt)
        now = datetime.now(timezone.utc)
        if risk_level == "L4":
            status = "failed"
            error = "This action is blocked by the agent safety policy."
            started_at = now
            finished_at = now
        elif risk_level in {"L2", "L3"}:
            status = "pending_approval"
            error = None
            started_at = None
            finished_at = None
        else:
            status = "running"
            error = None
            started_at = now
            finished_at = None

        run = AgentRun(
            user_id=user_id,
            conversation_id=conversation_id,
            skill_name=getattr(skill, "label", None),
            agent_name=agent_name,
            prompt=prompt[:20000],
            context=context,
            risk_level=risk_level,
            status=status,
            error=error,
            started_at=started_at,
            finished_at=finished_at,
        )
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def list_runs(
        self,
        user_id: UUID,
        limit: int = 100,
        status: str | None = None,
        risk_level: str | None = None,
        agent_name: str | None = None,
    ) -> list[AgentRun]:
        stmt = select(AgentRun).where(AgentRun.user_id == user_id)
        if status:
            stmt = stmt.where(AgentRun.status == status)
        if risk_level:
            stmt = stmt.where(AgentRun.risk_level == risk_level)
        if agent_name:
            stmt = stmt.where(AgentRun.agent_name == agent_name)
        result = await self.db.execute(
            stmt.order_by(AgentRun.created_at.desc()).limit(min(max(limit, 1), 200))
        )
        return list(result.scalars().all())

    async def get_run(self, user_id: UUID, run_id: UUID) -> AgentRun:
        return await self._get_run(user_id, run_id)

    async def approve(self, user_id: UUID, run_id: UUID, note: str | None = None) -> AgentRun:
        run = await self._get_run(user_id, run_id, for_update=True)
        self._transition(run, "running")
        run.approved_by = user_id
        run.decision_note = note
        run.started_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def cancel(self, user_id: UUID, run_id: UUID, note: str | None = None) -> AgentRun:
        run = await self._get_run(user_id, run_id, for_update=True)
        self._transition(run, "cancelled")
        run.decision_note = note
        run.finished_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def mark_succeeded(self, run_id: UUID, content: str, raw=None) -> AgentRun:
        run = await self._get_run_by_id(run_id, for_update=True)
        self._transition(run, "succeeded")
        run.result = content
        run.artifacts = collect_agent_artifacts(raw)
        run.finished_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def mark_failed(self, run_id: UUID, message: str) -> AgentRun:
        run = await self._get_run_by_id(run_id, for_update=True)
        self._transition(run, "failed")
        run.error = message
        run.finished_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def _get_run(self, user_id: UUID, run_id: UUID, for_update: bool = False) -> AgentRun:
        stmt = select(AgentRun).where(and_(AgentRun.user_id == user_id, AgentRun.id == run_id))
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        run = result.scalar_one_or_none()
        if not run:
            raise NotFoundException(resource_type="agent run", resource_id=str(run_id))
        return run

    async def _get_run_by_id(self, run_id: UUID, for_update: bool = False) -> AgentRun:
        stmt = select(AgentRun).where(AgentRun.id == run_id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        run = result.scalar_one_or_none()
        if not run:
            raise NotFoundException(resource_type="agent run", resource_id=str(run_id))
        return run

    @staticmethod
    def _transition(run: AgentRun, target: str) -> None:
        try:
            ensure_agent_run_transition(run.status, target)
        except AgentRunStateError as exc:
            raise ConflictException(str(exc)) from exc
        run.status = target
