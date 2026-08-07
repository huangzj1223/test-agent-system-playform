"""
认证授权服务

负责用户登录、token 签发/刷新/登出，以及权限（perms）缓存维护。
token 与权限均以 Redis 缓存，并通过 password_v 实现改密后旧 token 失效。
参考蓝本：CESHI0701 server/src/modules/base/services/auth.service.ts
"""

import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config.redis_client import RedisClient
from app.config.settings import settings
from app.models.menu import Menu
from app.models.role import Role, RoleMenu, UserRole
from app.models.user import User
from app.schemas.auth import (
    CurrentUser,
    RefreshResponse,
    RoleBrief,
    TokenResponse,
    UserInfoResponse,
)
from app.security.security_utils import (
    create_token,
    decode_token,
    verify_password,
)
from app.utils.exceptions import BadRequestException

# Redis 缓存键前缀
_TOKEN_KEY = "auth:token:{}"
_REFRESH_KEY = "auth:refresh:{}"
_PERMS_KEY = "auth:perms:{}"


class AuthService:
    """认证授权服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, username: str, password: str) -> TokenResponse:
        """用户登录：校验密码 → 签发双 token → 写入 Redis → 预热权限缓存。"""
        result = await self.db.execute(
            select(User)
            .where(User.username == username)
            .options(selectinload(User.user_roles))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise BadRequestException("用户名或密码错误")
        if user.status == 0 or not user.is_active:
            raise BadRequestException("用户已被禁用")
        if not verify_password(password, user.password_hash):
            raise BadRequestException("用户名或密码错误")

        role_ids = [str(ur.role_id) for ur in user.user_roles]
        payload = {
            "userId": str(user.id),
            "username": user.username,
            "roleIds": role_ids,
            "passwordVersion": user.password_v,
        }

        access_token = create_token(payload, settings.jwt_access_expire)
        refresh_token = create_token(
            {**payload, "isRefresh": True}, settings.jwt_refresh_expire
        )

        await RedisClient.set(
            _TOKEN_KEY.format(user.id), access_token, settings.jwt_access_expire
        )
        await RedisClient.set(
            _REFRESH_KEY.format(user.id), refresh_token, settings.jwt_refresh_expire
        )
        await self._cache_perms(user.id, [ur.role_id for ur in user.user_roles])

        return TokenResponse(
            token=access_token,
            refresh_token=refresh_token,
            expire=settings.jwt_access_expire,
        )

    async def refresh_token(self, refresh_token: str) -> RefreshResponse:
        """刷新 access token：校验 refresh token 有效性后签发新 access token。"""
        payload = decode_token(refresh_token)
        if not payload or not payload.get("isRefresh"):
            raise BadRequestException("token 无效")

        user_id = payload.get("userId")
        cached = await RedisClient.get(_REFRESH_KEY.format(user_id))
        if not cached or cached != refresh_token:
            raise BadRequestException("token 已失效")

        result = await self.db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user or user.password_v != payload.get("passwordVersion"):
            raise BadRequestException("token 已失效")

        new_token = create_token(
            {
                "userId": str(user.id),
                "username": user.username,
                "roleIds": payload.get("roleIds", []),
                "passwordVersion": user.password_v,
            },
            settings.jwt_access_expire,
        )
        await RedisClient.set(
            _TOKEN_KEY.format(user.id), new_token, settings.jwt_access_expire
        )
        return RefreshResponse(token=new_token, expire=settings.jwt_access_expire)

    async def logout(self, user_id: UUID) -> None:
        """登出：清除该用户的 access/refresh token 与权限缓存。"""
        await RedisClient.delete(
            _TOKEN_KEY.format(user_id),
            _REFRESH_KEY.format(user_id),
            _PERMS_KEY.format(user_id),
        )

    async def get_perms(self, user_id: UUID) -> list[str]:
        """获取用户权限标识：优先读 Redis，缺失回源数据库并重建缓存。"""
        cached = await RedisClient.get(_PERMS_KEY.format(user_id))
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                pass

        result = await self.db.execute(
            select(UserRole.role_id).where(UserRole.user_id == user_id)
        )
        role_ids = [row[0] for row in result.all()]
        return await self._cache_perms(user_id, role_ids)

    async def _cache_perms(self, user_id: UUID, role_ids: list[UUID]) -> list[str]:
        """汇总用户所有角色关联菜单的 perms，去重后写入 Redis 缓存。"""
        if not role_ids:
            await RedisClient.set(
                _PERMS_KEY.format(user_id), json.dumps([]), settings.jwt_access_expire
            )
            return []

        result = await self.db.execute(
            select(Menu.perms)
            .join(RoleMenu, RoleMenu.menu_id == Menu.id)
            .where(RoleMenu.role_id.in_(role_ids))
            .where(Menu.perms.isnot(None))
        )
        perms = [row[0] for row in result.all() if row[0]]
        unique_perms = sorted(set(perms))
        await RedisClient.set(
            _PERMS_KEY.format(user_id),
            json.dumps(unique_perms),
            settings.jwt_access_expire,
        )
        return unique_perms

    async def get_user_info(self, user_id: UUID) -> UserInfoResponse:
        """获取当前用户资料（含角色与权限点 buttons）。"""
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise BadRequestException("用户不存在")

        roles = [
            RoleBrief(id=ur.role.id, name=ur.role.name, label=ur.role.label)
            for ur in user.user_roles
        ]
        # 超管返回全部 perms，普通用户返回其角色 perms
        if user.username == settings.default_admin_username:
            all_perms = await self.db.execute(
                select(Menu.perms).where(Menu.perms.isnot(None))
            )
            buttons = sorted({row[0] for row in all_perms.all() if row[0]})
        else:
            buttons = await self.get_perms(user_id)

        return UserInfoResponse(
            id=user.id,
            username=user.username,
            name=user.name,
            nick_name=user.nick_name,
            head_img=user.head_img,
            phone=user.phone,
            email=user.email,
            remark=user.remark,
            status=user.status,
            department_id=user.department_id,
            roles=roles,
            buttons=buttons,
        )

    async def verify_access_token(self, token: str) -> CurrentUser:
        """校验 access token：签名/过期 + Redis 留存 + password_v 一致。"""
        payload = decode_token(token)
        if not payload or payload.get("isRefresh"):
            raise BadRequestException("token 无效")

        user_id = payload.get("userId")
        cached = await RedisClient.get(_TOKEN_KEY.format(user_id))
        if not cached or cached != token:
            raise BadRequestException("token 已失效")

        return CurrentUser(
            id=UUID(user_id),
            username=payload.get("username", ""),
            role_ids=[UUID(r) for r in payload.get("roleIds", [])],
            password_version=payload.get("passwordVersion", 1),
        )
