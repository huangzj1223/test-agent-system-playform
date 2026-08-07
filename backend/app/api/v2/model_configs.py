"""Model configuration management API."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep, require_perms
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.model_config import (
    ModelConfigCreate,
    ModelConfigInfo,
    ModelConfigUpdate,
    ModelProviderCreate,
    ModelProviderInfo,
    ModelProviderUpdate,
    TestConnectionRequest,
    TestConnectionResult,
)
from app.schemas.pagination import PaginatedResponse, PaginationInfo
from app.services.model_config_service import ModelConfigService
from app.services.model_provider_service import ModelProviderService

router = APIRouter(prefix="/model-config")


async def get_provider_service(db: AsyncSession = Depends(get_db)) -> ModelProviderService:
    return ModelProviderService(db)


async def get_model_service(db: AsyncSession = Depends(get_db)) -> ModelConfigService:
    return ModelConfigService(db)


@router.get("/providers", response_model=PaginatedResponse[ModelProviderInfo], summary="获取模型服务商列表")
async def list_providers(
    _user: CurrentUserDep,
    service: ModelProviderService = Depends(get_provider_service),
    p: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=200),
    keyword: str | None = Query(default=None, max_length=100),
):
    items, total = await service.list_providers((p - 1) * page_size, page_size, keyword)
    return PaginatedResponse(
        data=items,
        info=PaginationInfo.create(page=p, page_size=page_size, total=total, base_url="/api/v2/model-config/providers"),
    )


@router.get("/providers/all-with-models", response_model=SuccessResponse[list[ModelProviderInfo]], summary="获取全部服务商及模型")
async def all_with_models(
    _user: CurrentUserDep,
    service: ModelProviderService = Depends(get_provider_service),
):
    return SuccessResponse(data=await service.list_all_with_models())


@router.get("/providers/{provider_id}", response_model=SuccessResponse[ModelProviderInfo], summary="获取模型服务商详情")
async def get_provider(
    provider_id: UUID,
    _user: CurrentUserDep,
    service: ModelProviderService = Depends(get_provider_service),
):
    return SuccessResponse(data=await service.get_provider(provider_id))


@router.post("/providers", response_model=SuccessResponse[ModelProviderInfo], summary="创建模型服务商")
async def create_provider(
    body: ModelProviderCreate,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelProviderService = Depends(get_provider_service),
):
    return SuccessResponse(data=await service.create_provider(body))


@router.put("/providers/{provider_id}", response_model=SuccessResponse[ModelProviderInfo], summary="更新模型服务商")
async def update_provider(
    provider_id: UUID,
    body: ModelProviderUpdate,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelProviderService = Depends(get_provider_service),
):
    return SuccessResponse(data=await service.update_provider(provider_id, body))


@router.delete("/providers/{provider_id}", response_model=MessageResponse, summary="删除模型服务商")
async def delete_provider(
    provider_id: UUID,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelProviderService = Depends(get_provider_service),
):
    await service.delete_provider(provider_id)
    return MessageResponse(message="删除成功")


@router.post("/providers/test-connection", response_model=SuccessResponse[TestConnectionResult], summary="测试模型服务商连接")
async def test_connection(
    body: TestConnectionRequest,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelProviderService = Depends(get_provider_service),
):
    return SuccessResponse(data=await service.test_connection(body.provider_id, body.model_id))


@router.post("/models", response_model=SuccessResponse[ModelConfigInfo], summary="创建模型")
async def create_model(
    body: ModelConfigCreate,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelConfigService = Depends(get_model_service),
):
    return SuccessResponse(data=await service.create_model(body))


@router.put("/models/{model_id}", response_model=SuccessResponse[ModelConfigInfo], summary="更新模型")
async def update_model(
    model_id: UUID,
    body: ModelConfigUpdate,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelConfigService = Depends(get_model_service),
):
    return SuccessResponse(data=await service.update_model(model_id, body))


@router.delete("/models/{model_id}", response_model=MessageResponse, summary="删除模型")
async def delete_model(
    model_id: UUID,
    _user=Depends(require_perms("ai:model:write")),
    service: ModelConfigService = Depends(get_model_service),
):
    await service.delete_model(model_id)
    return MessageResponse(message="删除成功")
