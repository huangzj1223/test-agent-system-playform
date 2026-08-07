"""AG-UI conversation and streaming endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep
from app.schemas.agui import (
    AgUiRunRequest,
    ConversationCreate,
    ConversationDetail,
    ConversationInfo,
)
from app.schemas.common import SuccessResponse
from app.services.agui_service import AgUiService
from app.services.conversation_service import ConversationService
from app.services.memory_service import MemoryService
from app.services.model_chat_service import ModelChatService
from app.services.agent_tool_service import AgentToolService
from app.services.agent_skill_service import AgentSkillService
from app.services.agent_execution_service import AgentExecutionService
from app.services.agent_run_service import AgentRunService

router = APIRouter(prefix="/agui")
conversation_router = APIRouter(prefix="/conversations")


async def get_conversation_service(db: AsyncSession = Depends(get_db)) -> ConversationService:
    return ConversationService(db)


async def get_memory_service(db: AsyncSession = Depends(get_db)) -> MemoryService:
    return MemoryService(db)


async def get_agent_tool_service(db: AsyncSession = Depends(get_db)) -> AgentToolService:
    return AgentToolService(db)


async def get_agent_skill_service(db: AsyncSession = Depends(get_db)) -> AgentSkillService:
    return AgentSkillService(db)


async def get_model_chat_service(db: AsyncSession = Depends(get_db)) -> ModelChatService:
    return ModelChatService(db)


def get_agent_execution_service() -> AgentExecutionService:
    return AgentExecutionService()


async def get_agent_run_service(db: AsyncSession = Depends(get_db)) -> AgentRunService:
    return AgentRunService(db)


@router.post("/run", summary="AG-UI SSE 运行入口")
async def run_agui(
    body: AgUiRunRequest,
    current_user: CurrentUserDep,
    service: ConversationService = Depends(get_conversation_service),
    memory_service: MemoryService = Depends(get_memory_service),
    tool_service: AgentToolService = Depends(get_agent_tool_service),
    skill_service: AgentSkillService = Depends(get_agent_skill_service),
    model_chat_service: ModelChatService = Depends(get_model_chat_service),
    agent_execution_service: AgentExecutionService = Depends(get_agent_execution_service),
    agent_run_service: AgentRunService = Depends(get_agent_run_service),
):
    agui = AgUiService(
        service,
        memory_service,
        tool_service,
        skill_service,
        model_chat_service,
        agent_execution_service,
        agent_run_service,
    )
    return StreamingResponse(
        agui.run_events(
            user_id=current_user.id,
            conversation_id=body.conversation_id,
            messages=[item.model_dump() for item in body.messages],
            tools=[item.model_dump() for item in body.tools],
            provider_id=body.provider_id,
            model_id=body.model_id,
            forwarded_props=body.forwarded_props,
        ),
        media_type="text/event-stream",
    )


@conversation_router.get("", response_model=SuccessResponse[list[ConversationInfo]], summary="会话列表")
async def list_conversations(
    current_user: CurrentUserDep,
    service: ConversationService = Depends(get_conversation_service),
):
    return SuccessResponse(data=await service.list_conversations(current_user.id))


@conversation_router.post("", response_model=SuccessResponse[ConversationInfo], summary="创建会话")
async def create_conversation(
    body: ConversationCreate,
    current_user: CurrentUserDep,
    service: ConversationService = Depends(get_conversation_service),
):
    return SuccessResponse(data=await service.create_conversation(current_user.id, body.title))


@conversation_router.get("/{conversation_id}", response_model=SuccessResponse[ConversationDetail], summary="会话详情")
async def get_conversation(
    conversation_id: UUID,
    current_user: CurrentUserDep,
    service: ConversationService = Depends(get_conversation_service),
):
    return SuccessResponse(data=await service.get_conversation(current_user.id, conversation_id))
