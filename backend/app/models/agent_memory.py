"""Agent memory center models."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin


class AgentMemory(Base, UUIDMixin, TimestampMixin):
    """Markdown memory document visible to agents."""

    __tablename__ = "agent_memories"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    memory_key: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category: Mapped[str] = mapped_column(String(32), default="internal", nullable=False)
    risk_level: Mapped[str] = mapped_column(String(8), default="L1", nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    version: Mapped[str] = mapped_column(String(32), default="v1.0.0", nullable=False)
    built_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_read: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_suggest: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_auto_write: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    need_confirm: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    audit_log: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    related_keys: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    versions: Mapped[list["MemoryVersion"]] = relationship(
        back_populates="memory",
        cascade="all, delete-orphan",
    )
    suggestions: Mapped[list["MemorySuggestion"]] = relationship(
        back_populates="memory",
        cascade="all, delete-orphan",
    )


class MemoryVersion(Base, UUIDMixin, TimestampMixin):
    """Snapshot for every memory content change."""

    __tablename__ = "memory_versions"

    memory_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agent_memories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    change_type: Mapped[str] = mapped_column(String(32), default="update", nullable=False)
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    updater: Mapped[str | None] = mapped_column(String(100), nullable=True)

    memory: Mapped[AgentMemory] = relationship(back_populates="versions")


class MemorySuggestion(Base, UUIDMixin, TimestampMixin):
    """Pending or model-generated memory suggestion."""

    __tablename__ = "memory_suggestions"

    memory_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agent_memories.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    target_key: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True, nullable=False)

    memory: Mapped[AgentMemory | None] = relationship(back_populates="suggestions")


class MemoryReadLog(Base, UUIDMixin, TimestampMixin):
    """Read log for memory context injection."""

    __tablename__ = "memory_read_logs"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    memory_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("agent_memories.id", ondelete="SET NULL"),
        nullable=True,
    )
    memory_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
