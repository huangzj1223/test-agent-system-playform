"""
认证与权限守卫

提供 FastAPI 依赖：从 Authorization 头解析 Bearer token，
校验有效性并注入当前用户；以及基于权限标识（perms）的门控依赖。
"""

from typing import Annotated, Callable

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.settings import settings
from app.schemas.auth import CurrentUser
from app.services.auth_service import AuthService
from app.utils.exceptions import ForbiddenException, UnauthorizedException


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """认证依赖：校验 Bearer token，返回当前用户上下文。

    Args:
        authorization: Authorization 请求头（形如 "Bearer <token>"）
        db: 数据库会话
    Returns:
        当前登录用户上下文
    Raises:
        UnauthorizedException: 缺失/格式错误/无效/失效的 token
    """
    if not authorization:
        raise UnauthorizedException("缺少认证凭证")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthorizedException("认证凭证格式错误")

    token = parts[1]
    service = AuthService(db)
    try:
        return await service.verify_access_token(token)
    except Exception as exc:  # noqa: BLE001 统一转为 401，不透传细节
        raise UnauthorizedException("认证凭证无效或已失效") from exc


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def require_perms(*required: str) -> Callable:
    """构造权限门控依赖：要求当前用户具备全部指定权限标识。

    超管（默认管理员用户名）放行所有权限。

    Args:
        *required: 需要的权限标识（如 "system:user:list"）
    Returns:
        FastAPI 依赖函数
    """

    async def _checker(
        current_user: CurrentUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> CurrentUser:
        # 超管放行所有
        if current_user.username == settings.default_admin_username:
            return current_user

        service = AuthService(db)
        user_perms = set(await service.get_perms(current_user.id))
        missing = [p for p in required if p not in user_perms]
        if missing:
            raise ForbiddenException(f"缺少权限：{', '.join(missing)}")
        return current_user

    _checker.required_permissions = frozenset(required)
    return _checker
