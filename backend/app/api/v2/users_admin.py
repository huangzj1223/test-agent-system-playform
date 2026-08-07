"""
用户管理 API（后台管理侧）
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.pagination import PaginatedResponse, PaginationInfo
from app.schemas.user_admin import (
    ResetPasswordRequest,
    UserAdminInfo,
    UserCreate,
    UserUpdate,
)
from app.services.user_admin_service import UserAdminService

router = APIRouter(prefix="/users")


async def get_user_admin_service(db: AsyncSession = Depends(get_db)) -> UserAdminService:
    return UserAdminService(db)


@router.get("", response_model=PaginatedResponse[UserAdminInfo], summary="获取用户列表")
async def list_users(
    _user: CurrentUserDep,
    service: UserAdminService = Depends(get_user_admin_service),
    p: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=200),
):
    items, total = await service.list_users((p - 1) * page_size, page_size)
    return PaginatedResponse(
        data=items,
        info=PaginationInfo.create(page=p, page_size=page_size, total=total, base_url="/api/v2/users"),
    )


@router.get("/{user_id}", response_model=SuccessResponse[UserAdminInfo], summary="获取用户详情")
async def get_user(
    user_id: UUID,
    _user: CurrentUserDep,
    service: UserAdminService = Depends(get_user_admin_service),
):
    return SuccessResponse(data=await service.get_user(user_id))


@router.post("", response_model=SuccessResponse[UserAdminInfo], summary="创建用户")
async def create_user(
    body: UserCreate,
    _user: CurrentUserDep,
    service: UserAdminService = Depends(get_user_admin_service),
):
    return SuccessResponse(data=await service.create_user(body))


@router.put("/{user_id}", response_model=SuccessResponse[UserAdminInfo], summary="更新用户")
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    _user: CurrentUserDep,
    service: UserAdminService = Depends(get_user_admin_service),
):
    return SuccessResponse(data=await service.update_user(user_id, body))


@router.delete("/{user_id}", response_model=MessageResponse, summary="删除用户")
async def delete_user(
    user_id: UUID,
    _user: CurrentUserDep,
    service: UserAdminService = Depends(get_user_admin_service),
):
    await service.delete_user(user_id)
    return MessageResponse(message="删除成功")


@router.post("/{user_id}/reset-password", response_model=MessageResponse, summary="重置密码")
async def reset_password(
    user_id: UUID,
    body: ResetPasswordRequest,
    _user: CurrentUserDep,
    service: UserAdminService = Depends(get_user_admin_service),
):
    await service.reset_password(user_id, body)
    return MessageResponse(message="密码重置成功")
