"""Agent tool registry API."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep, require_perms
from app.schemas.agent_tool import AgentToolCreate, AgentToolInfo, AgentToolUpdate, ToolCallLogInfo
from app.schemas.common import SuccessResponse
from app.services.agent_tool_service import AgentToolService

router = APIRouter(prefix="/agent-tools")


async def get_agent_tool_service(db: AsyncSession = Depends(get_db)) -> AgentToolService:
    return AgentToolService(db)


@router.get("", response_model=SuccessResponse[list[AgentToolInfo]], summary="工具列表")
async def list_tools(current_user: CurrentUserDep, service: AgentToolService = Depends(get_agent_tool_service)):
    return SuccessResponse(data=await service.list_tools(current_user.id))


@router.post("", response_model=SuccessResponse[AgentToolInfo], summary="登记工具")
async def create_tool(
    body: AgentToolCreate,
    current_user=Depends(require_perms("ai:tool:write")),
    service: AgentToolService = Depends(get_agent_tool_service),
):
    return SuccessResponse(data=await service.create_tool(current_user.id, body))


@router.put("/{tool_id}", response_model=SuccessResponse[AgentToolInfo], summary="更新工具")
async def update_tool(
    tool_id: UUID,
    body: AgentToolUpdate,
    current_user=Depends(require_perms("ai:tool:write")),
    service: AgentToolService = Depends(get_agent_tool_service),
):
    return SuccessResponse(data=await service.update_tool(current_user.id, tool_id, body))


@router.get("/logs", response_model=SuccessResponse[list[ToolCallLogInfo]], summary="工具调用日志")
async def list_tool_logs(
    current_user: CurrentUserDep,
    limit: int = Query(default=50, ge=1, le=200),
    service: AgentToolService = Depends(get_agent_tool_service),
):
    return SuccessResponse(data=await service.list_call_logs(current_user.id, limit))
