"""Schemas for governed agent runs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AgentRunDecision(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class AgentRunInfo(BaseModel):
    id: UUID
    user_id: UUID
    conversation_id: UUID | None = None
    skill_name: str | None = None
    agent_name: str
    prompt: str
    context: dict
    risk_level: str
    status: str
    result: str | None = None
    error: str | None = None
    artifacts: list
    approved_by: UUID | None = None
    decision_note: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
