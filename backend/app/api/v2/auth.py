"""
认证 API

提供登录、刷新令牌、登出、当前用户信息接口
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    TokenResponse,
    UserInfoResponse,
)
from app.schemas.common import MessageResponse, SuccessResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth")


async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """获取认证服务实例"""
    return AuthService(db)


@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="用户登录",
    description="用户名+密码登录，返回 access/refresh 令牌",
)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> SuccessResponse[TokenResponse]:
    """用户登录"""
    token = await service.login(body.username, body.password)
    return SuccessResponse(data=token)


@router.post(
    "/refresh",
    response_model=SuccessResponse[RefreshResponse],
    summary="刷新令牌",
    description="使用 refresh token 换取新的 access token",
)
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
) -> SuccessResponse[RefreshResponse]:
    """刷新 access token"""
    result = await service.refresh_token(body.refresh_token)
    return SuccessResponse(data=result)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="登出",
    description="清除当前用户的令牌与权限缓存",
)
async def logout(
    current_user: CurrentUserDep,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    """用户登出"""
    await service.logout(current_user.id)
    return MessageResponse(message="登出成功")


@router.get(
    "/userinfo",
    response_model=SuccessResponse[UserInfoResponse],
    summary="当前用户信息",
    description="获取当前登录用户的资料、角色与权限点",
)
async def userinfo(
    current_user: CurrentUserDep,
    service: AuthService = Depends(get_auth_service),
) -> SuccessResponse[UserInfoResponse]:
    """获取当前用户信息"""
    info = await service.get_user_info(current_user.id)
    return SuccessResponse(data=info)
