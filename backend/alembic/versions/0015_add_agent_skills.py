"""add agent skills

Revision ID: 0015_agent_skills
Revises: 0014_agent_tools
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015_agent_skills"
down_revision: str | None = "0014_agent_tools"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_skills",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("entrypoint", sa.String(length=200), nullable=False),
        sa.Column("keywords", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_agent_skills_user_name"),
    )
    op.create_index("ix_agent_skills_name", "agent_skills", ["name"])
    op.create_index("ix_agent_skills_user_id", "agent_skills", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_skills_user_id", table_name="agent_skills")
    op.drop_index("ix_agent_skills_name", table_name="agent_skills")
    op.drop_table("agent_skills")
