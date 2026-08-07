"""Agent tool registry models."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class AgentTool(Base, UUIDMixin, TimestampMixin):
    """Registered callable tool."""

    __tablename__ = "agent_tools"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tool_type: Mapped[str] = mapped_column(String(32), default="local", nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ToolCallLog(Base, UUIDMixin, TimestampMixin):
    """Tool call trace produced by AG-UI."""

    __tablename__ = "tool_call_logs"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    conversation_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    tool_name: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    arguments: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="success", nullable=False)
