"""Agent tool registry service."""

from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_tool import AgentTool, ToolCallLog
from app.utils.exceptions import NotFoundException


def normalize_tool_name(name: str) -> str:
    return name.strip().lower()


def tool_available(name: str, tools: list[dict]) -> bool:
    normalized = normalize_tool_name(name)
    return any(normalize_tool_name(str(tool.get("name", ""))) == normalized and bool(tool.get("enabled", True)) for tool in tools)


class AgentToolService:
    """CRUD and runtime lookup for agent tools."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_builtin(self, user_id: UUID) -> None:
        result = await self.db.execute(
            select(AgentTool).where(and_(AgentTool.user_id == user_id, AgentTool.name == "echo"))
        )
        if result.scalar_one_or_none():
            return
        self.db.add(
            AgentTool(
                user_id=user_id,
                name="echo",
                label="Echo 回显",
                description="本地回显工具，用于验证 AG-UI tool_call 事件链路。",
                tool_type="local",
                config={"handler": "echo"},
                enabled=True,
                sort=0,
            )
        )
        await self.db.commit()

    async def list_tools(self, user_id: UUID, enabled_only: bool = False) -> list[AgentTool]:
        await self.ensure_builtin(user_id)
        stmt = select(AgentTool).where(AgentTool.user_id == user_id)
        if enabled_only:
            stmt = stmt.where(AgentTool.enabled.is_(True))
        stmt = stmt.order_by(AgentTool.sort.asc(), AgentTool.created_at.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_tool(self, user_id: UUID, data) -> AgentTool:
        tool = AgentTool(
            user_id=user_id,
            name=normalize_tool_name(data.name),
            label=data.label,
            description=data.description,
            tool_type=data.tool_type or "local",
            config=data.config or {},
            enabled=data.enabled if data.enabled is not None else True,
            sort=data.sort or 100,
        )
        self.db.add(tool)
        await self.db.commit()
        await self.db.refresh(tool)
        return tool

    async def update_tool(self, user_id: UUID, tool_id: UUID, data) -> AgentTool:
        tool = await self._get_tool(user_id, tool_id)
        patch = data.model_dump(exclude_unset=True)
        if "name" in patch and patch["name"]:
            patch["name"] = normalize_tool_name(patch["name"])
        for key, value in patch.items():
            setattr(tool, key, value)
        await self.db.commit()
        await self.db.refresh(tool)
        return tool

    async def record_call(
        self,
        user_id: UUID,
        conversation_id: UUID | None,
        tool_name: str,
        arguments: dict,
        result: str | None,
        status: str = "success",
    ) -> ToolCallLog:
        log = ToolCallLog(
            user_id=user_id,
            conversation_id=conversation_id,
            tool_name=normalize_tool_name(tool_name),
            arguments=arguments,
            result=result,
            status=status,
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def list_call_logs(self, user_id: UUID, limit: int = 50) -> list[ToolCallLog]:
        result = await self.db.execute(
            select(ToolCallLog)
            .where(ToolCallLog.user_id == user_id)
            .order_by(ToolCallLog.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _get_tool(self, user_id: UUID, tool_id: UUID) -> AgentTool:
        result = await self.db.execute(
            select(AgentTool).where(and_(AgentTool.user_id == user_id, AgentTool.id == tool_id))
        )
        tool = result.scalar_one_or_none()
        if not tool:
            raise NotFoundException(resource_type="工具", resource_id=str(tool_id))
        return tool
