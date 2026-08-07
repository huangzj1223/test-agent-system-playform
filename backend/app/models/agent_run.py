"""Persisted agent execution records and approval decisions."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class AgentRun(Base, UUIDMixin, TimestampMixin):
    """One governed invocation of a registered testing agent."""

    __tablename__ = "agent_runs"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    conversation_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    skill_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    agent_name: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(4), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifacts: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    approved_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
