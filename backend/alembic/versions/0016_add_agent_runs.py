"""add governed agent runs

Revision ID: 0016_agent_runs
Revises: 0015_agent_skills
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016_agent_runs"
down_revision: str | None = "0015_agent_skills"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_runs",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("skill_name", sa.String(length=120), nullable=True),
        sa.Column("agent_name", sa.String(length=40), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("risk_level", sa.String(length=4), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("artifacts", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decision_note", sa.String(length=500), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_runs_user_id", "agent_runs", ["user_id"])
    op.create_index("ix_agent_runs_conversation_id", "agent_runs", ["conversation_id"])
    op.create_index("ix_agent_runs_agent_name", "agent_runs", ["agent_name"])
    op.create_index("ix_agent_runs_risk_level", "agent_runs", ["risk_level"])
    op.create_index("ix_agent_runs_status", "agent_runs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_agent_runs_status", table_name="agent_runs")
    op.drop_index("ix_agent_runs_risk_level", table_name="agent_runs")
    op.drop_index("ix_agent_runs_agent_name", table_name="agent_runs")
    op.drop_index("ix_agent_runs_conversation_id", table_name="agent_runs")
    op.drop_index("ix_agent_runs_user_id", table_name="agent_runs")
    op.drop_table("agent_runs")
