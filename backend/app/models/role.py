"""
角色与权限关联模型

定义系统角色表，以及用户-角色、角色-菜单、角色-部门关联表
"""

from uuid import UUID as UUIDType

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Role(Base, UUIDMixin, TimestampMixin):
    """系统角色表"""

    __tablename__ = "sys_roles"
    __table_args__ = {"comment": "系统角色表"}

    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="角色名称"
    )
    label: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True, comment="角色标识（唯一）"
    )
    remark: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="备注"
    )
    status: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="状态 1=启用 0=禁用"
    )

    # 关系
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole", back_populates="role", cascade="all, delete-orphan"
    )
    role_menus: Mapped[list["RoleMenu"]] = relationship(
        "RoleMenu", back_populates="role", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, label={self.label})>"


class UserRole(Base, UUIDMixin, TimestampMixin):
    """用户-角色关联表"""

    __tablename__ = "sys_user_roles"
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
        {"comment": "用户-角色关联表"},
    )

    user_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="用户 ID",
    )
    role_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_roles.id", ondelete="CASCADE"),
        nullable=False,
        comment="角色 ID",
    )

    user: Mapped["User"] = relationship("User", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_roles")


class RoleMenu(Base, UUIDMixin, TimestampMixin):
    """角色-菜单关联表"""

    __tablename__ = "sys_role_menus"
    __table_args__ = (
        UniqueConstraint("role_id", "menu_id", name="uq_role_menu"),
        {"comment": "角色-菜单关联表"},
    )

    role_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_roles.id", ondelete="CASCADE"),
        nullable=False,
        comment="角色 ID",
    )
    menu_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_menus.id", ondelete="CASCADE"),
        nullable=False,
        comment="菜单 ID",
    )

    role: Mapped["Role"] = relationship("Role", back_populates="role_menus")
    menu: Mapped["Menu"] = relationship("Menu", back_populates="role_menus")
