"""
用户管理 Schema（后台管理侧）

区别于 schemas/auth.py 的当前用户上下文，此处用于用户 CRUD 管理。
"""

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.auth import RoleBrief
from app.schemas.common import TimestampMixin


class UserCreate(BaseModel):
    """创建用户请求"""

    username: str = Field(..., min_length=1, max_length=100, description="用户名")
    password: str = Field(..., min_length=6, max_length=128, description="明文密码")
    email: EmailStr = Field(..., description="邮箱")
    name: str | None = Field(default=None, max_length=100, description="姓名")
    nick_name: str | None = Field(default=None, max_length=100, description="昵称")
    phone: str | None = Field(default=None, max_length=20, description="手机号")
    remark: str | None = Field(default=None, max_length=500, description="备注")
    status: int = Field(default=1, description="状态 1=启用 0=禁用")
    department_id: UUID | None = Field(default=None, description="所属部门 ID")
    position_id: UUID | None = Field(default=None, description="岗位 ID")
    role_ids: list[UUID] = Field(default_factory=list, description="角色 ID 列表")


class UserUpdate(BaseModel):
    """更新用户请求（不含密码，改密走独立接口）"""

    email: EmailStr | None = Field(default=None, description="邮箱")
    name: str | None = Field(default=None, max_length=100, description="姓名")
    nick_name: str | None = Field(default=None, max_length=100, description="昵称")
    phone: str | None = Field(default=None, max_length=20, description="手机号")
    remark: str | None = Field(default=None, max_length=500, description="备注")
    status: int | None = Field(default=None, description="状态")
    department_id: UUID | None = Field(default=None, description="所属部门 ID")
    position_id: UUID | None = Field(default=None, description="岗位 ID")
    role_ids: list[UUID] | None = Field(default=None, description="角色 ID 列表")


class ResetPasswordRequest(BaseModel):
    """重置/修改密码请求"""

    new_password: str = Field(..., min_length=6, max_length=128, description="新明文密码")


class UserAdminInfo(TimestampMixin):
    """用户管理信息响应（不含密码）"""

    id: UUID
    username: str
    email: str | None = None
    name: str | None = None
    nick_name: str | None = None
    head_img: str | None = None
    phone: str | None = None
    remark: str | None = None
    status: int
    department_id: UUID | None = None
    position_id: UUID | None = None
    roles: list[RoleBrief] = Field(default_factory=list)

    model_config = {"from_attributes": True}
