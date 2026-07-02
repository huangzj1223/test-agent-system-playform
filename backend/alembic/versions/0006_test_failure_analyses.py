"""add test failure analyses

Revision ID: 0006_test_failure_analyses
Revises: 0005_add_folders_folder_type
Create Date: 2026-06-30 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006_test_failure_analyses"
down_revision: Union[str, None] = "0005_add_folders_folder_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "test_failure_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("test_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "script_type",
            postgresql.ENUM(
                "api_test",
                "scenario",
                "web_test",
                "test_case",
                name="scripttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "analysis_status",
            sa.String(length=30),
            nullable=False,
            server_default="completed",
        ),
        sa.Column(
            "failure_category",
            sa.String(length=80),
            nullable=False,
            server_default="unknown",
        ),
        sa.Column(
            "severity",
            sa.String(length=30),
            nullable=False,
            server_default="medium",
        ),
        sa.Column("confidence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("evidence", postgresql.JSONB(), nullable=True),
        sa.Column("recommendations", postgresql.JSONB(), nullable=True),
        sa.Column("knowledge_refs", postgresql.JSONB(), nullable=True),
        sa.Column("raw_context", postgresql.JSONB(), nullable=True),
        sa.Column("model_name", sa.String(length=120), nullable=True),
        sa.Column(
            "analysis_source",
            sa.String(length=40),
            nullable=False,
            server_default="heuristic",
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["job_id"], ["test_run_script_jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["test_run_id"], ["test_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", name="uq_test_failure_analyses_job_id"),
    )
    op.create_index("ix_test_failure_analyses_project_id", "test_failure_analyses", ["project_id"])
    op.create_index("ix_test_failure_analyses_test_run_id", "test_failure_analyses", ["test_run_id"])
    op.create_index("ix_test_failure_analyses_job_id", "test_failure_analyses", ["job_id"])
    op.create_index("ix_test_failure_analyses_script_type", "test_failure_analyses", ["script_type"])
    op.create_index("ix_test_failure_analyses_analysis_status", "test_failure_analyses", ["analysis_status"])
    op.create_index("ix_test_failure_analyses_failure_category", "test_failure_analyses", ["failure_category"])


def downgrade() -> None:
    op.drop_index("ix_test_failure_analyses_failure_category", table_name="test_failure_analyses")
    op.drop_index("ix_test_failure_analyses_analysis_status", table_name="test_failure_analyses")
    op.drop_index("ix_test_failure_analyses_script_type", table_name="test_failure_analyses")
    op.drop_index("ix_test_failure_analyses_job_id", table_name="test_failure_analyses")
    op.drop_index("ix_test_failure_analyses_test_run_id", table_name="test_failure_analyses")
    op.drop_index("ix_test_failure_analyses_project_id", table_name="test_failure_analyses")
    op.drop_table("test_failure_analyses")
