"""
部门与岗位管理 Schema
"""

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import TimestampMixin


class DepartmentCreate(BaseModel):
    """创建部门请求"""

    name: str = Field(..., min_length=1, max_length=100, description="部门名称")
    parent_id: UUID | None = Field(default=None, description="父级部门 ID")
    dept_type: str | None = Field(default=None, max_length=20, description="部门类型")
    leader: str | None = Field(default=None, max_length=50, description="负责人")
    phone: str | None = Field(default=None, max_length=20, description="联系电话")
    order_num: int = Field(default=0, description="排序号")
    status: int = Field(default=1, description="状态 1=启用 0=禁用")


class DepartmentUpdate(BaseModel):
    """更新部门请求"""

    name: str | None = Field(default=None, max_length=100, description="部门名称")
    parent_id: UUID | None = Field(default=None, description="父级部门 ID")
    dept_type: str | None = Field(default=None, max_length=20, description="部门类型")
    leader: str | None = Field(default=None, max_length=50, description="负责人")
    phone: str | None = Field(default=None, max_length=20, description="联系电话")
    order_num: int | None = Field(default=None, description="排序号")
    status: int | None = Field(default=None, description="状态")


class DepartmentInfo(TimestampMixin):
    """部门信息响应"""

    id: UUID
    name: str
    parent_id: UUID | None = None
    dept_type: str | None = None
    leader: str | None = None
    phone: str | None = None
    order_num: int
    status: int
    children: list["DepartmentInfo"] = Field(default_factory=list, description="子部门")

    model_config = {"from_attributes": True}


DepartmentInfo.model_rebuild()


class PositionCreate(BaseModel):
    """创建岗位请求"""

    name: str = Field(..., min_length=1, max_length=50, description="岗位名称")
    description: str | None = Field(default=None, max_length=200, description="岗位描述")
    order_num: int = Field(default=0, description="排序号")
    status: int = Field(default=1, description="状态 1=启用 0=禁用")


class PositionUpdate(BaseModel):
    """更新岗位请求"""

    name: str | None = Field(default=None, max_length=50, description="岗位名称")
    description: str | None = Field(default=None, max_length=200, description="岗位描述")
    order_num: int | None = Field(default=None, description="排序号")
    status: int | None = Field(default=None, description="状态")


class PositionInfo(TimestampMixin):
    """岗位信息响应"""

    id: UUID
    name: str
    description: str | None = None
    order_num: int
    status: int

    model_config = {"from_attributes": True}
