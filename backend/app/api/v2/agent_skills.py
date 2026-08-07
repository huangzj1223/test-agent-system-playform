"""Agent skill registry API."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep, require_perms
from app.schemas.agent_skill import AgentSkillCreate, AgentSkillInfo, AgentSkillUpdate, SkillRouteRequest
from app.schemas.common import SuccessResponse
from app.services.agent_skill_service import AgentSkillService

router = APIRouter(prefix="/agent-skills")


async def get_agent_skill_service(db: AsyncSession = Depends(get_db)) -> AgentSkillService:
    return AgentSkillService(db)


@router.get("", response_model=SuccessResponse[list[AgentSkillInfo]], summary="技能列表")
async def list_skills(current_user: CurrentUserDep, service: AgentSkillService = Depends(get_agent_skill_service)):
    return SuccessResponse(data=await service.list_skills(current_user.id))


@router.post("", response_model=SuccessResponse[AgentSkillInfo], summary="登记技能")
async def create_skill(
    body: AgentSkillCreate,
    current_user=Depends(require_perms("ai:skill:write")),
    service: AgentSkillService = Depends(get_agent_skill_service),
):
    return SuccessResponse(data=await service.create_skill(current_user.id, body))


@router.put("/{skill_id}", response_model=SuccessResponse[AgentSkillInfo], summary="更新技能")
async def update_skill(
    skill_id: UUID,
    body: AgentSkillUpdate,
    current_user=Depends(require_perms("ai:skill:write")),
    service: AgentSkillService = Depends(get_agent_skill_service),
):
    return SuccessResponse(data=await service.update_skill(current_user.id, skill_id, body))


@router.post("/route", response_model=SuccessResponse[AgentSkillInfo | None], summary="意图路由")
async def route_skill(
    body: SkillRouteRequest,
    current_user: CurrentUserDep,
    service: AgentSkillService = Depends(get_agent_skill_service),
):
    return SuccessResponse(data=await service.route_intent(current_user.id, body.prompt))
