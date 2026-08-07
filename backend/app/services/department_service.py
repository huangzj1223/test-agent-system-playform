"""
部门与岗位管理服务
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department, Position
from app.schemas.department import (
    DepartmentCreate,
    DepartmentInfo,
    DepartmentUpdate,
    PositionCreate,
    PositionInfo,
    PositionUpdate,
)
from app.utils.exceptions import ConflictException, NotFoundException


class DepartmentService:
    """部门管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_department_tree(self) -> list[DepartmentInfo]:
        """获取部门树。"""
        result = await self.db.execute(
            select(Department).order_by(Department.order_num)
        )
        depts = result.scalars().all()
        info_map = {d.id: DepartmentInfo.model_validate(d) for d in depts}
        roots: list[DepartmentInfo] = []
        for d in depts:
            node = info_map[d.id]
            if d.parent_id and d.parent_id in info_map:
                info_map[d.parent_id].children.append(node)
            else:
                roots.append(node)
        return roots

    async def create_department(self, data: DepartmentCreate) -> DepartmentInfo:
        """创建部门。"""
        dept = Department(**data.model_dump())
        self.db.add(dept)
        await self.db.flush()
        await self.db.refresh(dept)
        return DepartmentInfo.model_validate(dept)

    async def update_department(
        self, dept_id: UUID, data: DepartmentUpdate
    ) -> DepartmentInfo:
        """更新部门。"""
        dept = await self._get_or_404(dept_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(dept, field, value)
        await self.db.flush()
        await self.db.refresh(dept)
        return DepartmentInfo.model_validate(dept)

    async def delete_department(self, dept_id: UUID) -> None:
        """删除部门。"""
        dept = await self._get_or_404(dept_id)
        await self.db.delete(dept)
        await self.db.flush()

    async def _get_or_404(self, dept_id: UUID) -> Department:
        result = await self.db.execute(
            select(Department).where(Department.id == dept_id)
        )
        dept = result.scalar_one_or_none()
        if not dept:
            raise NotFoundException(resource_type="部门", resource_id=str(dept_id))
        return dept


class PositionService:
    """岗位管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_positions(self) -> list[PositionInfo]:
        """获取岗位列表。"""
        result = await self.db.execute(
            select(Position).order_by(Position.order_num)
        )
        return [PositionInfo.model_validate(p) for p in result.scalars().all()]

    async def create_position(self, data: PositionCreate) -> PositionInfo:
        """创建岗位。"""
        exists = await self.db.scalar(
            select(Position).where(Position.name == data.name)
        )
        if exists:
            raise ConflictException(f"岗位 '{data.name}' 已存在")
        pos = Position(**data.model_dump())
        self.db.add(pos)
        await self.db.flush()
        await self.db.refresh(pos)
        return PositionInfo.model_validate(pos)

    async def update_position(
        self, pos_id: UUID, data: PositionUpdate
    ) -> PositionInfo:
        """更新岗位。"""
        pos = await self._get_or_404(pos_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(pos, field, value)
        await self.db.flush()
        await self.db.refresh(pos)
        return PositionInfo.model_validate(pos)

    async def delete_position(self, pos_id: UUID) -> None:
        """删除岗位。"""
        pos = await self._get_or_404(pos_id)
        await self.db.delete(pos)
        await self.db.flush()

    async def _get_or_404(self, pos_id: UUID) -> Position:
        result = await self.db.execute(select(Position).where(Position.id == pos_id))
        pos = result.scalar_one_or_none()
        if not pos:
            raise NotFoundException(resource_type="岗位", resource_id=str(pos_id))
        return pos
