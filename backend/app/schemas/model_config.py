"""Pydantic schemas for model configuration management."""

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import TimestampMixin


class ModelConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    model_id: str = Field(..., min_length=1, max_length=100)
    context_window: int | None = Field(default=None, ge=0)
    max_output_tokens: int | None = Field(default=None, ge=0)
    pool_group: str | None = Field(default=None, max_length=50)
    default_temperature: float | None = Field(default=None, ge=0, le=2)
    default_top_p: float | None = Field(default=None, ge=0, le=1)
    timeout_sec: int | None = Field(default=None, ge=1, le=600)
    retry_count: int | None = Field(default=None, ge=0, le=10)
    support_text: bool = True
    support_image_input: bool = False
    support_image_output: bool = False
    support_tools: bool = True
    support_stream: bool = True
    support_code: bool = False
    support_long_text: bool = False
    enabled: bool = True
    sort: int = Field(default=0, ge=0)


class ModelConfigCreate(ModelConfigBase):
    provider_id: UUID


class ModelConfigUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    model_id: str | None = Field(default=None, min_length=1, max_length=100)
    context_window: int | None = Field(default=None, ge=0)
    max_output_tokens: int | None = Field(default=None, ge=0)
    pool_group: str | None = Field(default=None, max_length=50)
    default_temperature: float | None = Field(default=None, ge=0, le=2)
    default_top_p: float | None = Field(default=None, ge=0, le=1)
    timeout_sec: int | None = Field(default=None, ge=1, le=600)
    retry_count: int | None = Field(default=None, ge=0, le=10)
    support_text: bool | None = None
    support_image_input: bool | None = None
    support_image_output: bool | None = None
    support_tools: bool | None = None
    support_stream: bool | None = None
    support_code: bool | None = None
    support_long_text: bool | None = None
    enabled: bool | None = None
    sort: int | None = Field(default=None, ge=0)


class ModelConfigInfo(ModelConfigBase, TimestampMixin):
    id: UUID
    provider_id: UUID

    model_config = {"from_attributes": True}


class ModelProviderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    provider: str = Field(..., min_length=1, max_length=50)
    api_endpoint: str = Field(..., min_length=1, max_length=500)
    protocol_type: str = Field(default="openai-compatible", min_length=1, max_length=50)
    api_version: str | None = Field(default=None, max_length=50)
    remark: str | None = Field(default=None, max_length=500)
    enabled: bool = True
    sort: int = Field(default=0, ge=0)


class ModelProviderCreate(ModelProviderBase):
    api_key: str | None = Field(default=None, max_length=1000)


class ModelProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    provider: str | None = Field(default=None, min_length=1, max_length=50)
    api_endpoint: str | None = Field(default=None, min_length=1, max_length=500)
    api_key: str | None = Field(default=None, max_length=1000)
    protocol_type: str | None = Field(default=None, min_length=1, max_length=50)
    api_version: str | None = Field(default=None, max_length=50)
    remark: str | None = Field(default=None, max_length=500)
    enabled: bool | None = None
    sort: int | None = Field(default=None, ge=0)


class ModelProviderInfo(ModelProviderBase, TimestampMixin):
    id: UUID
    has_api_key: bool
    models: list[ModelConfigInfo] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class TestConnectionRequest(BaseModel):
    provider_id: UUID
    model_id: str | None = Field(default=None, max_length=100)


class TestConnectionResult(BaseModel):
    reachable: bool
    status_code: int | None = None
    message: str
