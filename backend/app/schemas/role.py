"""
角色管理 Schema
"""

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import TimestampMixin


class RoleCreate(BaseModel):
    """创建角色请求"""

    name: str = Field(..., min_length=1, max_length=100, description="角色名称")
    label: str | None = Field(default=None, max_length=100, description="角色标识（唯一）")
    remark: str | None = Field(default=None, max_length=500, description="备注")
    status: int = Field(default=1, description="状态 1=启用 0=禁用")
    menu_ids: list[UUID] = Field(default_factory=list, description="绑定的菜单 ID 列表")


class RoleUpdate(BaseModel):
    """更新角色请求"""

    name: str | None = Field(default=None, max_length=100, description="角色名称")
    label: str | None = Field(default=None, max_length=100, description="角色标识")
    remark: str | None = Field(default=None, max_length=500, description="备注")
    status: int | None = Field(default=None, description="状态")
    menu_ids: list[UUID] | None = Field(default=None, description="绑定的菜单 ID 列表")


class RoleInfo(TimestampMixin):
    """角色信息响应"""

    id: UUID
    name: str
    label: str | None = None
    remark: str | None = None
    status: int
    menu_ids: list[UUID] = Field(default_factory=list, description="绑定的菜单 ID 列表")

    model_config = {"from_attributes": True}
