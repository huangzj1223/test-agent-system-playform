"""Agent skill schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AgentSkillInfo(BaseModel):
    id: UUID
    name: str
    label: str
    description: str | None = None
    entrypoint: str
    keywords: list[str]
    config: dict
    enabled: bool
    sort: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AgentSkillCreate(BaseModel):
    name: str
    label: str
    description: str | None = None
    entrypoint: str
    keywords: list[str] | None = None
    config: dict | None = None
    enabled: bool | None = True
    sort: int | None = 100


class AgentSkillUpdate(BaseModel):
    name: str | None = None
    label: str | None = None
    description: str | None = None
    entrypoint: str | None = None
    keywords: list[str] | None = None
    config: dict | None = None
    enabled: bool | None = None
    sort: int | None = None


class SkillRouteRequest(BaseModel):
    prompt: str
