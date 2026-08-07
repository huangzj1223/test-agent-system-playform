"""
角色管理服务

提供角色 CRUD 与角色-菜单绑定
"""

from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.role import Role, RoleMenu
from app.schemas.role import RoleCreate, RoleInfo, RoleUpdate
from app.utils.exceptions import ConflictException, NotFoundException


class RoleService:
    """角色管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_roles(self, offset: int, limit: int) -> tuple[list[RoleInfo], int]:
        """分页获取角色列表。"""
        total = await self.db.scalar(select(func.count()).select_from(Role))
        result = await self.db.execute(
            select(Role)
            .options(selectinload(Role.role_menus))
            .order_by(Role.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        roles = result.scalars().all()
        items = [self._to_info(r) for r in roles]
        return items, total or 0

    async def get_role(self, role_id: UUID) -> RoleInfo:
        """获取角色详情。"""
        role = await self._get_or_404(role_id)
        return self._to_info(role)

    async def create_role(self, data: RoleCreate) -> RoleInfo:
        """创建角色并绑定菜单。"""
        if data.label:
            exists = await self.db.scalar(
                select(Role).where(Role.label == data.label)
            )
            if exists:
                raise ConflictException(f"角色标识 '{data.label}' 已存在")

        role = Role(
            name=data.name,
            label=data.label,
            remark=data.remark,
            status=data.status,
        )
        self.db.add(role)
        await self.db.flush()

        for menu_id in data.menu_ids:
            self.db.add(RoleMenu(role_id=role.id, menu_id=menu_id))
        await self.db.flush()

        role = await self._get_or_404(role.id)
        return self._to_info(role)

    async def update_role(self, role_id: UUID, data: RoleUpdate) -> RoleInfo:
        """更新角色，menu_ids 非空则整体替换绑定。"""
        role = await self._get_or_404(role_id)

        if data.label and data.label != role.label:
            exists = await self.db.scalar(
                select(Role).where(Role.label == data.label, Role.id != role_id)
            )
            if exists:
                raise ConflictException(f"角色标识 '{data.label}' 已存在")

        for field in ("name", "label", "remark", "status"):
            value = getattr(data, field)
            if value is not None:
                setattr(role, field, value)

        if data.menu_ids is not None:
            await self.db.execute(
                delete(RoleMenu).where(RoleMenu.role_id == role_id)
            )
            for menu_id in data.menu_ids:
                self.db.add(RoleMenu(role_id=role_id, menu_id=menu_id))

        await self.db.flush()
        role = await self._get_or_404(role_id)
        return self._to_info(role)

    async def delete_role(self, role_id: UUID) -> None:
        """删除角色（关联表级联删除）。"""
        role = await self._get_or_404(role_id)
        await self.db.delete(role)
        await self.db.flush()

    async def _get_or_404(self, role_id: UUID) -> Role:
        result = await self.db.execute(
            select(Role)
            .where(Role.id == role_id)
            .options(selectinload(Role.role_menus))
        )
        role = result.scalar_one_or_none()
        if not role:
            raise NotFoundException(resource_type="角色", resource_id=str(role_id))
        return role

    @staticmethod
    def _to_info(role: Role) -> RoleInfo:
        return RoleInfo(
            id=role.id,
            name=role.name,
            label=role.label,
            remark=role.remark,
            status=role.status,
            menu_ids=[rm.menu_id for rm in role.role_menus],
            created_at=role.created_at,
            updated_at=role.updated_at,
        )
