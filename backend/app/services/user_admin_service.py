"""
用户管理服务（后台管理侧）

提供用户 CRUD、角色分配、密码重置。
"""

from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config.redis_client import RedisClient
from app.models.role import UserRole
from app.models.user import User
from app.schemas.auth import RoleBrief
from app.schemas.user_admin import (
    ResetPasswordRequest,
    UserAdminInfo,
    UserCreate,
    UserUpdate,
)
from app.security.security_utils import hash_password
from app.utils.exceptions import ConflictException, NotFoundException


class UserAdminService:
    """用户管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_users(self, offset: int, limit: int) -> tuple[list[UserAdminInfo], int]:
        """分页获取用户列表。"""
        total = await self.db.scalar(select(func.count()).select_from(User))
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = [self._to_info(u) for u in result.scalars().all()]
        return items, total or 0

    async def get_user(self, user_id: UUID) -> UserAdminInfo:
        """获取用户详情。"""
        user = await self._get_or_404(user_id)
        return self._to_info(user)

    async def create_user(self, data: UserCreate) -> UserAdminInfo:
        """创建用户并分配角色。"""
        for field, label in (("username", "用户名"), ("email", "邮箱")):
            exists = await self.db.scalar(
                select(User).where(getattr(User, field) == getattr(data, field))
            )
            if exists:
                raise ConflictException(f"{label} '{getattr(data, field)}' 已存在")

        user = User(
            username=data.username,
            password_hash=hash_password(data.password),
            email=data.email,
            name=data.name,
            nick_name=data.nick_name,
            phone=data.phone,
            remark=data.remark,
            status=data.status,
            is_active=data.status == 1,
            department_id=data.department_id,
            position_id=data.position_id,
        )
        self.db.add(user)
        await self.db.flush()

        for role_id in data.role_ids:
            self.db.add(UserRole(user_id=user.id, role_id=role_id))
        await self.db.flush()

        user = await self._get_or_404(user.id)
        return self._to_info(user)

    async def update_user(self, user_id: UUID, data: UserUpdate) -> UserAdminInfo:
        """更新用户，role_ids 非空则整体替换。"""
        user = await self._get_or_404(user_id)

        for field in ("email", "name", "nick_name", "phone", "remark", "status",
                      "department_id", "position_id"):
            value = getattr(data, field)
            if value is not None:
                setattr(user, field, value)
        if data.status is not None:
            user.is_active = data.status == 1

        if data.role_ids is not None:
            await self.db.execute(delete(UserRole).where(UserRole.user_id == user_id))
            for role_id in data.role_ids:
                self.db.add(UserRole(user_id=user_id, role_id=role_id))
            await RedisClient.delete(f"auth:perms:{user_id}")

        await self.db.flush()
        user = await self._get_or_404(user_id)
        return self._to_info(user)

    async def delete_user(self, user_id: UUID) -> None:
        """删除用户。"""
        user = await self._get_or_404(user_id)
        await self.db.delete(user)
        await self.db.flush()
        await RedisClient.delete(
            f"auth:token:{user_id}",
            f"auth:refresh:{user_id}",
            f"auth:perms:{user_id}",
        )

    async def reset_password(self, user_id: UUID, data: ResetPasswordRequest) -> None:
        """重置密码：更新哈希并递增 password_v，使旧 token 失效。"""
        user = await self._get_or_404(user_id)
        user.password_hash = hash_password(data.new_password)
        user.password_v += 1
        await self.db.flush()
        await RedisClient.delete(
            f"auth:token:{user_id}",
            f"auth:refresh:{user_id}",
            f"auth:perms:{user_id}",
        )

    async def _get_or_404(self, user_id: UUID) -> User:
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(resource_type="用户", resource_id=str(user_id))
        return user

    @staticmethod
    def _to_info(user: User) -> UserAdminInfo:
        return UserAdminInfo(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            nick_name=user.nick_name,
            head_img=user.head_img,
            phone=user.phone,
            remark=user.remark,
            status=user.status,
            department_id=user.department_id,
            position_id=user.position_id,
            roles=[
                RoleBrief(id=ur.role.id, name=ur.role.name, label=ur.role.label)
                for ur in user.user_roles
            ],
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
