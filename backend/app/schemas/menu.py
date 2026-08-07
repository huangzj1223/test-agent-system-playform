"""
菜单管理 Schema
"""

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import TimestampMixin


class MenuCreate(BaseModel):
    """创建菜单请求"""

    parent_id: UUID | None = Field(default=None, description="父级菜单 ID")
    name: str = Field(..., min_length=1, max_length=100, description="菜单名称")
    router: str | None = Field(default=None, max_length=200, description="前端路由路径")
    perms: str | None = Field(default=None, max_length=200, description="权限标识")
    menu_type: int = Field(default=0, description="类型 0=目录 1=菜单 2=按钮")
    icon: str | None = Field(default=None, max_length=100, description="图标")
    order_num: int = Field(default=0, description="排序号")
    view_path: str | None = Field(default=None, max_length=200, description="视图组件路径")
    keep_alive: int = Field(default=1, description="是否缓存 1=是 0=否")
    is_show: int = Field(default=1, description="是否显示 1=是 0=否")


class MenuUpdate(BaseModel):
    """更新菜单请求"""

    parent_id: UUID | None = Field(default=None, description="父级菜单 ID")
    name: str | None = Field(default=None, max_length=100, description="菜单名称")
    router: str | None = Field(default=None, max_length=200, description="前端路由路径")
    perms: str | None = Field(default=None, max_length=200, description="权限标识")
    menu_type: int | None = Field(default=None, description="类型")
    icon: str | None = Field(default=None, max_length=100, description="图标")
    order_num: int | None = Field(default=None, description="排序号")
    view_path: str | None = Field(default=None, max_length=200, description="视图组件路径")
    keep_alive: int | None = Field(default=None, description="是否缓存")
    is_show: int | None = Field(default=None, description="是否显示")


class MenuInfo(TimestampMixin):
    """菜单信息响应"""

    id: UUID
    parent_id: UUID | None = None
    name: str
    router: str | None = None
    perms: str | None = None
    menu_type: int
    icon: str | None = None
    order_num: int
    view_path: str | None = None
    keep_alive: int
    is_show: int
    children: list["MenuInfo"] = Field(default_factory=list, description="子菜单")

    model_config = {"from_attributes": True}


MenuInfo.model_rebuild()
