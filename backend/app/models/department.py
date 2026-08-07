"""
部门与岗位模型

定义系统部门表（树形）与岗位表
"""

from uuid import UUID as UUIDType

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Department(Base, UUIDMixin, TimestampMixin):
    """系统部门表（树形结构）"""

    __tablename__ = "sys_departments"
    __table_args__ = {"comment": "系统部门表"}

    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="部门名称"
    )
    parent_id: Mapped[UUIDType | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_departments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="父级部门 ID",
    )
    dept_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="部门类型"
    )
    leader: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="负责人"
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="联系电话"
    )
    order_num: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="排序号（升序）"
    )
    status: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="状态 1=启用 0=禁用"
    )

    # 关系
    users: Mapped[list["User"]] = relationship(
        "User", back_populates="department", foreign_keys="User.department_id"
    )

    def __repr__(self) -> str:
        return f"<Department(id={self.id}, name={self.name})>"


class Position(Base, UUIDMixin, TimestampMixin):
    """系统岗位表"""

    __tablename__ = "sys_positions"
    __table_args__ = {"comment": "系统岗位表"}

    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, comment="岗位名称"
    )
    description: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="岗位描述"
    )
    order_num: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="排序号（升序）"
    )
    status: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="状态 1=启用 0=禁用"
    )

    # 关系
    users: Mapped[list["User"]] = relationship(
        "User", back_populates="position", foreign_keys="User.position_id"
    )

    def __repr__(self) -> str:
        return f"<Position(id={self.id}, name={self.name})>"
