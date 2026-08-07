"""Schemas for AG-UI conversation and run endpoints."""

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import TimestampMixin


class AgUiMessageInput(BaseModel):
    role: str = Field(..., min_length=1, max_length=20)
    content: str = ""


class AgUiToolInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    parameters: dict | None = None


class AgUiRunRequest(BaseModel):
    conversation_id: UUID | None = None
    messages: list[AgUiMessageInput] = Field(default_factory=list)
    tools: list[AgUiToolInput] = Field(default_factory=list)
    provider_id: UUID | None = None
    model_id: str | None = Field(default=None, max_length=100)
    forwarded_props: dict | None = None


class ConversationCreate(BaseModel):
    title: str = Field(default="新会话", min_length=1, max_length=200)


class ConversationInfo(TimestampMixin):
    id: UUID
    user_id: UUID
    title: str
    status: str

    model_config = {"from_attributes": True}


class ChatMessageInfo(TimestampMixin):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    blocks: list | None = None
    tool_calls: list | None = None

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationInfo):
    messages: list[ChatMessageInfo] = Field(default_factory=list)
