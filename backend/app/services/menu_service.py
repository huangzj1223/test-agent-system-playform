"""
菜单管理服务

提供菜单 CRUD，返回树形结构。
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.menu import Menu
from app.schemas.menu import MenuCreate, MenuInfo, MenuUpdate
from app.utils.exceptions import NotFoundException


class MenuService:
    """菜单管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_menu_tree(self) -> list[MenuInfo]:
        """获取完整菜单树（按 order_num 排序）。"""
        result = await self.db.execute(select(Menu).order_by(Menu.order_num))
        menus = result.scalars().all()
        return self._build_tree(menus)

    async def create_menu(self, data: MenuCreate) -> MenuInfo:
        """创建菜单。"""
        menu = Menu(**data.model_dump())
        self.db.add(menu)
        await self.db.flush()
        await self.db.refresh(menu)
        return MenuInfo.model_validate(menu)

    async def update_menu(self, menu_id: UUID, data: MenuUpdate) -> MenuInfo:
        """更新菜单。"""
        menu = await self._get_or_404(menu_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(menu, field, value)
        await self.db.flush()
        await self.db.refresh(menu)
        return MenuInfo.model_validate(menu)

    async def delete_menu(self, menu_id: UUID) -> None:
        """删除菜单（子菜单级联删除）。"""
        menu = await self._get_or_404(menu_id)
        await self.db.delete(menu)
        await self.db.flush()

    async def _get_or_404(self, menu_id: UUID) -> Menu:
        result = await self.db.execute(select(Menu).where(Menu.id == menu_id))
        menu = result.scalar_one_or_none()
        if not menu:
            raise NotFoundException(resource_type="菜单", resource_id=str(menu_id))
        return menu

    @staticmethod
    def _build_tree(menus: list[Menu]) -> list[MenuInfo]:
        """构造树形结构。"""
        info_map: dict[UUID, MenuInfo] = {}
        for m in menus:
            info_map[m.id] = MenuInfo.model_validate(m)

        roots: list[MenuInfo] = []
        for m in menus:
            node = info_map[m.id]
            if m.parent_id and m.parent_id in info_map:
                info_map[m.parent_id].children.append(node)
            else:
                roots.append(node)
        return roots
