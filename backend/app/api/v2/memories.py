"""Memory center API."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep, require_perms
from app.schemas.common import SuccessResponse
from app.schemas.memory import (
    MemoryCreate,
    MemoryDetail,
    MemoryInfo,
    MemoryRollback,
    MemorySave,
    PendingConfirm,
    PendingCreate,
    MemorySuggestionInfo,
)
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memories")


async def get_memory_service(db: AsyncSession = Depends(get_db)) -> MemoryService:
    return MemoryService(db)


@router.get("", response_model=SuccessResponse[list[MemoryInfo]], summary="记忆列表")
async def list_memories(current_user: CurrentUserDep, service: MemoryService = Depends(get_memory_service)):
    return SuccessResponse(data=await service.list_memories(current_user.id))


@router.get("/stats", response_model=SuccessResponse[dict], summary="记忆统计")
async def memory_stats(current_user: CurrentUserDep, service: MemoryService = Depends(get_memory_service)):
    return SuccessResponse(data=await service.stats(current_user.id))


@router.post("", response_model=SuccessResponse[MemoryInfo], summary="创建记忆")
async def create_memory(
    body: MemoryCreate,
    current_user=Depends(require_perms("ai:memory:write")),
    service: MemoryService = Depends(get_memory_service),
):
    return SuccessResponse(data=await service.create_memory(current_user.id, body, current_user.username))


@router.get("/{memory_key}", response_model=SuccessResponse[MemoryDetail], summary="记忆详情")
async def memory_detail(memory_key: str, current_user: CurrentUserDep, service: MemoryService = Depends(get_memory_service)):
    return SuccessResponse(data=await service.detail(current_user.id, memory_key))


@router.put("/{memory_key}", response_model=SuccessResponse[MemoryInfo], summary="保存记忆")
async def save_memory(
    memory_key: str,
    body: MemorySave,
    current_user=Depends(require_perms("ai:memory:write")),
    service: MemoryService = Depends(get_memory_service),
):
    return SuccessResponse(data=await service.save_content(current_user.id, memory_key, body.content, current_user.username))


@router.post("/{memory_key}/rollback", response_model=SuccessResponse[MemoryInfo], summary="版本回滚")
async def rollback_memory(
    memory_key: str,
    body: MemoryRollback,
    current_user=Depends(require_perms("ai:memory:write")),
    service: MemoryService = Depends(get_memory_service),
):
    return SuccessResponse(data=await service.rollback(current_user.id, memory_key, body.version, current_user.username))


@router.post("/pending", response_model=SuccessResponse[MemorySuggestionInfo], summary="创建待确认记忆")
async def create_pending(
    body: PendingCreate,
    current_user=Depends(require_perms("ai:memory:write")),
    service: MemoryService = Depends(get_memory_service),
):
    return SuccessResponse(data=await service.create_pending(current_user.id, body.target_key, body.text, body.source))


@router.post("/pending/{suggestion_id}/confirm", response_model=SuccessResponse[MemoryInfo], summary="确认待确认记忆")
async def confirm_pending(
    suggestion_id: UUID,
    body: PendingConfirm,
    current_user=Depends(require_perms("ai:memory:write")),
    service: MemoryService = Depends(get_memory_service),
):
    return SuccessResponse(data=await service.confirm_pending(current_user.id, suggestion_id, body.text))


@router.post("/pending/{suggestion_id}/ignore", response_model=SuccessResponse[MemorySuggestionInfo], summary="驳回待确认记忆")
async def ignore_pending(
    suggestion_id: UUID,
    current_user=Depends(require_perms("ai:memory:write")),
    service: MemoryService = Depends(get_memory_service),
):
    return SuccessResponse(data=await service.ignore_pending(current_user.id, suggestion_id))
