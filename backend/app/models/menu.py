"""
菜单权限模型

定义系统菜单表（目录/菜单/按钮三级），承载路由与权限标识
"""

from uuid import UUID as UUIDType

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Menu(Base, UUIDMixin, TimestampMixin):
    """系统菜单表"""

    __tablename__ = "sys_menus"
    __table_args__ = {"comment": "系统菜单表"}

    parent_id: Mapped[UUIDType | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_menus.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="父级菜单 ID",
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="菜单名称"
    )
    router: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="前端路由路径"
    )
    perms: Mapped[str | None] = mapped_column(
        String(200), nullable=True, index=True, comment="权限标识（如 system:user:list）"
    )
    menu_type: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="类型 0=目录 1=菜单 2=按钮"
    )
    icon: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="图标"
    )
    order_num: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="排序号（升序）"
    )
    view_path: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="视图组件路径"
    )
    keep_alive: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="是否缓存 1=是 0=否"
    )
    is_show: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False, comment="是否显示 1=是 0=否"
    )

    # 关系
    role_menus: Mapped[list["RoleMenu"]] = relationship(
        "RoleMenu", back_populates="menu", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Menu(id={self.id}, name={self.name}, perms={self.perms})>"
