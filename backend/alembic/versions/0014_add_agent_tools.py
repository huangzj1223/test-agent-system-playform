"""add agent tools

Revision ID: 0014_agent_tools
Revises: 0013_memory_center
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014_agent_tools"
down_revision: str | None = "0013_memory_center"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_tools",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("tool_type", sa.String(length=32), nullable=False),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_agent_tools_user_name"),
    )
    op.create_index("ix_agent_tools_name", "agent_tools", ["name"])
    op.create_index("ix_agent_tools_user_id", "agent_tools", ["user_id"])

    op.create_table(
        "tool_call_logs",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tool_name", sa.String(length=80), nullable=False),
        sa.Column("arguments", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tool_call_logs_tool_name", "tool_call_logs", ["tool_name"])
    op.create_index("ix_tool_call_logs_user_id", "tool_call_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_tool_call_logs_user_id", table_name="tool_call_logs")
    op.drop_index("ix_tool_call_logs_tool_name", table_name="tool_call_logs")
    op.drop_table("tool_call_logs")
    op.drop_index("ix_agent_tools_user_id", table_name="agent_tools")
    op.drop_index("ix_agent_tools_name", table_name="agent_tools")
    op.drop_table("agent_tools")
