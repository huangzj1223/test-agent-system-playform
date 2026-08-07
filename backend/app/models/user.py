"""
用户模型

定义系统用户表结构
"""

from uuid import UUID as UUIDType

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
# fmt: off  MC8zOmFIVnBZMlhwdTRUbGphRG1zWjg2VVZSM1NRPT06M2MwNWIzZmY=

class User(Base, UUIDMixin, TimestampMixin):
    """
    用户表

    存储系统用户信息
    """
    __tablename__ = "users"
    __table_args__ = {"comment": "用户表"}

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="用户邮箱"
    )
    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="用户名（登录账号）"
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="密码哈希（bcrypt）"
    )
    is_active: Mapped[bool] = mapped_column(
        default=True,
        comment="是否激活"
    )
    # ==================== RBAC 扩展字段 ====================
    password_v: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="密码版本号（改密后旧 token 失效）"
    )
    status: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="状态 1=启用 0=禁用"
    )
    name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="姓名"
    )
    nick_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="昵称"
    )
    head_img: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="头像 URL"
    )
    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="手机号"
    )
    remark: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="备注"
    )
    department_id: Mapped[UUIDType | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_departments.id", ondelete="SET NULL"),
        nullable=True,
        comment="所属部门 ID"
    )
    position_id: Mapped[UUIDType | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sys_positions.id", ondelete="SET NULL"),
        nullable=True,
        comment="岗位 ID"
    )
# fmt: off  MS8zOmFIVnBZMlhwdTRUbGphRG1zWjg2VVZSM1NRPT06M2MwNWIzZmY=

    # 关系
    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    department: Mapped["Department | None"] = relationship(
        "Department",
        back_populates="users",
        foreign_keys=[department_id]
    )
    position: Mapped["Position | None"] = relationship(
        "Position",
        back_populates="users",
        foreign_keys=[position_id]
    )
    created_projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="creator",
        foreign_keys="Project.created_by"
    )
    owned_test_cases: Mapped[list["TestCase"]] = relationship(
        "TestCase",
        back_populates="owner",
        foreign_keys="TestCase.owner_id"
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
# type: ignore  Mi8zOmFIVnBZMlhwdTRUbGphRG1zWjg2VVZSM1NRPT06M2MwNWIzZmY=

