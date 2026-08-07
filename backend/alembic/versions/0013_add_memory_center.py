"""add memory center

Revision ID: 0013_memory_center
Revises: 0012_agui_conversations
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013_memory_center"
down_revision: str | None = "0012_agui_conversations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_memories",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("memory_key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=300), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("risk_level", sa.String(length=8), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("built_in", sa.Boolean(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("can_read", sa.Boolean(), nullable=False),
        sa.Column("can_suggest", sa.Boolean(), nullable=False),
        sa.Column("can_auto_write", sa.Boolean(), nullable=False),
        sa.Column("need_confirm", sa.Boolean(), nullable=False),
        sa.Column("audit_log", sa.Boolean(), nullable=False),
        sa.Column("related_keys", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "memory_key", name="uq_agent_memories_user_key"),
    )
    op.create_index("ix_agent_memories_memory_key", "agent_memories", ["memory_key"])
    op.create_index("ix_agent_memories_user_id", "agent_memories", ["user_id"])

    op.create_table(
        "memory_versions",
        sa.Column("memory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("change_type", sa.String(length=32), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("updater", sa.String(length=100), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["memory_id"], ["agent_memories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_memory_versions_memory_id", "memory_versions", ["memory_id"])
    op.create_index("ix_memory_versions_version", "memory_versions", ["version"])

    op.create_table(
        "memory_suggestions",
        sa.Column("memory_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_key", sa.String(length=64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=300), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["memory_id"], ["agent_memories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_memory_suggestions_memory_id", "memory_suggestions", ["memory_id"])
    op.create_index("ix_memory_suggestions_status", "memory_suggestions", ["status"])
    op.create_index("ix_memory_suggestions_target_key", "memory_suggestions", ["target_key"])
    op.create_index("ix_memory_suggestions_user_id", "memory_suggestions", ["user_id"])

    op.create_table(
        "memory_read_logs",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("memory_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("memory_key", sa.String(length=64), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("hit", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["memory_id"], ["agent_memories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_memory_read_logs_user_id", "memory_read_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_memory_read_logs_user_id", table_name="memory_read_logs")
    op.drop_table("memory_read_logs")
    op.drop_index("ix_memory_suggestions_user_id", table_name="memory_suggestions")
    op.drop_index("ix_memory_suggestions_target_key", table_name="memory_suggestions")
    op.drop_index("ix_memory_suggestions_status", table_name="memory_suggestions")
    op.drop_index("ix_memory_suggestions_memory_id", table_name="memory_suggestions")
    op.drop_table("memory_suggestions")
    op.drop_index("ix_memory_versions_version", table_name="memory_versions")
    op.drop_index("ix_memory_versions_memory_id", table_name="memory_versions")
    op.drop_table("memory_versions")
    op.drop_index("ix_agent_memories_user_id", table_name="agent_memories")
    op.drop_index("ix_agent_memories_memory_key", table_name="agent_memories")
    op.drop_table("agent_memories")
