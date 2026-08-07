"""
认证相关 Schema

定义登录、令牌、当前用户信息等请求/响应模型
"""

from uuid import UUID

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """登录请求"""

    username: str = Field(..., min_length=1, max_length=100, description="用户名")
    password: str = Field(..., min_length=1, max_length=128, description="明文密码")


class TokenResponse(BaseModel):
    """登录成功返回的令牌信息"""

    token: str = Field(..., description="access token")
    refresh_token: str = Field(..., description="refresh token")
    expire: int = Field(..., description="access token 过期秒数")


class RefreshRequest(BaseModel):
    """刷新令牌请求"""

    refresh_token: str = Field(..., description="refresh token")


class RefreshResponse(BaseModel):
    """刷新令牌返回"""

    token: str = Field(..., description="新的 access token")
    expire: int = Field(..., description="access token 过期秒数")


class RoleBrief(BaseModel):
    """角色简要信息"""

    id: UUID
    name: str
    label: str | None = None

    model_config = {"from_attributes": True}


class CurrentUser(BaseModel):
    """当前登录用户上下文（由认证中间件注入）"""

    id: UUID = Field(..., description="用户 ID")
    username: str = Field(..., description="用户名")
    role_ids: list[UUID] = Field(default_factory=list, description="角色 ID 列表")
    password_version: int = Field(default=1, description="密码版本")


class UserInfoResponse(BaseModel):
    """当前用户资料（含角色与权限点）"""

    id: UUID
    username: str
    name: str | None = None
    nick_name: str | None = None
    head_img: str | None = None
    phone: str | None = None
    email: str | None = None
    remark: str | None = None
    status: int = 1
    department_id: UUID | None = None
    roles: list[RoleBrief] = Field(default_factory=list)
    buttons: list[str] = Field(default_factory=list, description="权限点标识列表")

    model_config = {"from_attributes": True}
