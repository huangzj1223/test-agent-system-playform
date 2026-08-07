"""add agui conversations

Revision ID: 0012_agui_conversations
Revises: 0011_model_config
Create Date: 2026-07-15 01:00:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012_agui_conversations"
down_revision: Union[str, None] = "0011_model_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("user_id", sa.UUID(), nullable=False, comment="User ID"),
        sa.Column("title", sa.String(length=200), nullable=False, comment="Conversation title"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active", comment="Conversation status"),
        sa.Column("id", sa.UUID(), nullable=False, comment="Primary key"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="Created at"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, comment="Updated at"),
        sa.PrimaryKeyConstraint("id"),
        comment="AG-UI conversation",
    )
    op.create_index(op.f("ix_conversations_user_id"), "conversations", ["user_id"], unique=False)
    op.create_table(
        "chat_messages",
        sa.Column("conversation_id", sa.UUID(), nullable=False, comment="Conversation ID"),
        sa.Column("role", sa.String(length=20), nullable=False, comment="Message role"),
        sa.Column("content", sa.Text(), nullable=False, server_default="", comment="Message content"),
        sa.Column("blocks", postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment="AG-UI blocks"),
        sa.Column("tool_calls", postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment="Tool calls"),
        sa.Column("id", sa.UUID(), nullable=False, comment="Primary key"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="Created at"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, comment="Updated at"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        comment="AG-UI chat message",
    )
    op.create_index(op.f("ix_chat_messages_conversation_id"), "chat_messages", ["conversation_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_messages_conversation_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index(op.f("ix_conversations_user_id"), table_name="conversations")
    op.drop_table("conversations")
