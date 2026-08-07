"""Approval and audit endpoints for governed agent executions."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import async_session_factory, get_db
from app.middleware.auth_guard import CurrentUserDep
from app.schemas.agent_run import AgentRunDecision, AgentRunInfo
from app.schemas.common import SuccessResponse
from app.services.agent_execution_service import AgentExecutionError, AgentExecutionService
from app.services.agent_run_service import AgentRunService
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/agent-runs")


async def get_agent_run_service(db: AsyncSession = Depends(get_db)) -> AgentRunService:
    return AgentRunService(db)


async def get_conversation_service(db: AsyncSession = Depends(get_db)) -> ConversationService:
    return ConversationService(db)


def get_agent_execution_service() -> AgentExecutionService:
    return AgentExecutionService()


async def execute_approved_agent_run(run_id: UUID, user_id: UUID) -> None:
    """Execute an approved run without holding the approval request open."""
    async with async_session_factory() as db:
        service = AgentRunService(db)
        run = await service.get_run(user_id, run_id)
        if run.status != "running":
            return
        agent_name = run.agent_name
        prompt = run.prompt
        context = run.context
        conversation_id = run.conversation_id

    try:
        result = await AgentExecutionService().execute(
            agent_name,
            prompt,
            context=context,
            timeout_seconds=600,
        )
        content = result.content
        raw = result.raw
        error = None
    except AgentExecutionError as exc:
        content = None
        raw = None
        error = str(exc)
    except Exception:
        content = None
        raw = None
        error = "Agent execution failed."

    async with async_session_factory() as db:
        service = AgentRunService(db)
        current = await service.get_run(user_id, run_id)
        if current.status != "running":
            return
        if error is None:
            completed = await service.mark_succeeded(run_id, content or "", raw)
        else:
            completed = await service.mark_failed(run_id, error)
        if conversation_id:
            await ConversationService(db).save_message(
                conversation_id=conversation_id,
                role="assistant",
                content=completed.result or completed.error or "Agent run finished without output.",
            )
            await db.commit()


@router.get("", response_model=SuccessResponse[list[AgentRunInfo]], summary="List agent runs")
async def list_agent_runs(
    current_user: CurrentUserDep,
    limit: int = Query(default=100, ge=1, le=200),
    status: str | None = Query(default=None, pattern="^(pending_approval|running|succeeded|failed|cancelled)$"),
    risk_level: str | None = Query(default=None, pattern="^L[1-4]$"),
    agent_name: str | None = Query(default=None, min_length=1, max_length=40),
    service: AgentRunService = Depends(get_agent_run_service),
):
    return SuccessResponse(
        data=await service.list_runs(current_user.id, limit, status, risk_level, agent_name)
    )


@router.get("/{run_id}", response_model=SuccessResponse[AgentRunInfo], summary="Get agent run")
async def get_agent_run(
    run_id: UUID,
    current_user: CurrentUserDep,
    service: AgentRunService = Depends(get_agent_run_service),
):
    return SuccessResponse(data=await service.get_run(current_user.id, run_id))


@router.post("/{run_id}/approve", response_model=SuccessResponse[AgentRunInfo], summary="Approve and run agent")
async def approve_agent_run(
    run_id: UUID,
    body: AgentRunDecision,
    background_tasks: BackgroundTasks,
    current_user: CurrentUserDep,
    service: AgentRunService = Depends(get_agent_run_service),
):
    run = await service.approve(current_user.id, run_id, body.note)
    background_tasks.add_task(execute_approved_agent_run, run.id, current_user.id)
    return SuccessResponse(data=run)


@router.post("/{run_id}/reject", response_model=SuccessResponse[AgentRunInfo], summary="Reject agent run")
async def reject_agent_run(
    run_id: UUID,
    body: AgentRunDecision,
    current_user: CurrentUserDep,
    service: AgentRunService = Depends(get_agent_run_service),
):
    return SuccessResponse(data=await service.cancel(current_user.id, run_id, body.note or "Rejected by user"))


@router.post("/{run_id}/cancel", response_model=SuccessResponse[AgentRunInfo], summary="Cancel agent run")
async def cancel_agent_run(
    run_id: UUID,
    body: AgentRunDecision,
    current_user: CurrentUserDep,
    service: AgentRunService = Depends(get_agent_run_service),
):
    return SuccessResponse(data=await service.cancel(current_user.id, run_id, body.note))
