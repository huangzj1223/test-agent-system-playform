"""Conversation and chat message persistence for AG-UI."""

from uuid import UUID as UUIDType

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Conversation(Base, UUIDMixin, TimestampMixin):
    """A user conversation thread."""

    __tablename__ = "conversations"
    __table_args__ = {"comment": "AG-UI conversation"}

    user_id: Mapped[UUIDType] = mapped_column(UUID(as_uuid=True), nullable=False, index=True, comment="User ID")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="Conversation title")
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, comment="Conversation status")

    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base, UUIDMixin, TimestampMixin):
    """A persisted chat message."""

    __tablename__ = "chat_messages"
    __table_args__ = {"comment": "AG-UI chat message"}

    conversation_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Conversation ID",
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, comment="Message role")
    content: Mapped[str] = mapped_column(Text, default="", nullable=False, comment="Message content")
    blocks: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list, comment="AG-UI blocks")
    tool_calls: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list, comment="Tool calls")

    conversation: Mapped[Conversation] = relationship("Conversation", back_populates="messages")
