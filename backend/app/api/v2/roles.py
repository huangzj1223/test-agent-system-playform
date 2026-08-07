"""
角色管理 API
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep, require_perms
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.pagination import PaginatedResponse, PaginationInfo
from app.schemas.role import RoleCreate, RoleInfo, RoleUpdate
from app.services.role_service import RoleService

router = APIRouter(prefix="/roles")


async def get_role_service(db: AsyncSession = Depends(get_db)) -> RoleService:
    return RoleService(db)


@router.get("", response_model=PaginatedResponse[RoleInfo], summary="获取角色列表")
async def list_roles(
    _user: CurrentUserDep,
    service: RoleService = Depends(get_role_service),
    p: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=200),
):
    items, total = await service.list_roles((p - 1) * page_size, page_size)
    return PaginatedResponse(
        data=items,
        info=PaginationInfo.create(page=p, page_size=page_size, total=total, base_url="/api/v2/roles"),
    )


@router.get("/{role_id}", response_model=SuccessResponse[RoleInfo], summary="获取角色详情")
async def get_role(
    role_id: UUID,
    _user: CurrentUserDep,
    service: RoleService = Depends(get_role_service),
):
    return SuccessResponse(data=await service.get_role(role_id))


@router.post("", response_model=SuccessResponse[RoleInfo], summary="创建角色")
async def create_role(
    body: RoleCreate,
    _user: CurrentUserDep,
    service: RoleService = Depends(get_role_service),
):
    return SuccessResponse(data=await service.create_role(body))


@router.put("/{role_id}", response_model=SuccessResponse[RoleInfo], summary="更新角色")
async def update_role(
    role_id: UUID,
    body: RoleUpdate,
    _user: CurrentUserDep,
    service: RoleService = Depends(get_role_service),
):
    return SuccessResponse(data=await service.update_role(role_id, body))


@router.delete("/{role_id}", response_model=MessageResponse, summary="删除角色")
async def delete_role(
    role_id: UUID,
    _user: CurrentUserDep,
    service: RoleService = Depends(get_role_service),
):
    await service.delete_role(role_id)
    return MessageResponse(message="删除成功")
