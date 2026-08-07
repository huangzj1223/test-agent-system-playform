"""Agent tool schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AgentToolInfo(BaseModel):
    id: UUID
    name: str
    label: str
    description: str | None = None
    tool_type: str
    config: dict
    enabled: bool
    sort: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AgentToolCreate(BaseModel):
    name: str
    label: str
    description: str | None = None
    tool_type: str | None = "local"
    config: dict | None = None
    enabled: bool | None = True
    sort: int | None = 100


class AgentToolUpdate(BaseModel):
    name: str | None = None
    label: str | None = None
    description: str | None = None
    tool_type: str | None = None
    config: dict | None = None
    enabled: bool | None = None
    sort: int | None = None


class ToolCallLogInfo(BaseModel):
    id: UUID
    conversation_id: UUID | None = None
    tool_name: str
    arguments: dict
    result: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
