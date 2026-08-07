"""Memory center schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MemoryBase(BaseModel):
    memory_key: str
    name: str
    description: str | None = None
    category: str
    risk_level: str
    version: str
    built_in: bool
    enabled: bool
    can_read: bool
    can_suggest: bool
    can_auto_write: bool
    need_confirm: bool
    audit_log: bool
    related_keys: list[str]
    sort: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class MemoryInfo(MemoryBase):
    id: UUID


class MemoryVersionInfo(BaseModel):
    id: UUID
    version: str
    content: str
    change_type: str
    note: str | None = None
    updater: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MemorySuggestionInfo(BaseModel):
    id: UUID
    target_key: str
    text: str
    source: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MemoryDetail(MemoryInfo):
    content: str
    versions: list[MemoryVersionInfo] = []
    suggestions: list[MemorySuggestionInfo] = []


class MemoryCreate(BaseModel):
    memory_key: str = Field(pattern=r"^[a-zA-Z0-9_-]+\.md$")
    name: str | None = None
    description: str | None = None
    content: str | None = None
    category: str | None = None
    risk_level: str | None = None


class MemorySave(BaseModel):
    content: str


class MemoryRollback(BaseModel):
    version: str


class PendingCreate(BaseModel):
    target_key: str = Field(pattern=r"^[a-zA-Z0-9_-]+\.md$")
    text: str
    source: str | None = None


class PendingConfirm(BaseModel):
    text: str | None = None

