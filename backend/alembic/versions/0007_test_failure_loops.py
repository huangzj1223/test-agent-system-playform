"""add test failure loop runs

Revision ID: 0007_test_failure_loops
Revises: 0006_test_failure_analyses
Create Date: 2026-07-01 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007_test_failure_loops"
down_revision: Union[str, None] = "0006_test_failure_analyses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "test_failure_loop_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("test_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
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
            nullable=True,
        ),
        sa.Column("strategy", sa.String(length=40), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="running"),
        sa.Column("current_phase", sa.String(length=40), nullable=False, server_default="discover"),
        sa.Column("current_iteration", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("max_iterations", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("stop_reason", sa.Text(), nullable=True),
        sa.Column("safety_flags", postgresql.JSONB(), nullable=True),
        sa.Column("context_snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("final_result", postgresql.JSONB(), nullable=True),
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
    )
    op.create_index("ix_test_failure_loop_runs_project_id", "test_failure_loop_runs", ["project_id"])
    op.create_index("ix_test_failure_loop_runs_test_run_id", "test_failure_loop_runs", ["test_run_id"])
    op.create_index("ix_test_failure_loop_runs_job_id", "test_failure_loop_runs", ["job_id"])
    op.create_index("ix_test_failure_loop_runs_script_type", "test_failure_loop_runs", ["script_type"])
    op.create_index("ix_test_failure_loop_runs_strategy", "test_failure_loop_runs", ["strategy"])
    op.create_index("ix_test_failure_loop_runs_status", "test_failure_loop_runs", ["status"])
    op.create_index("ix_test_failure_loop_runs_current_phase", "test_failure_loop_runs", ["current_phase"])

    op.create_table(
        "test_failure_loop_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("loop_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("iteration", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("step_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("phase", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="completed"),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("input_snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("output_summary", sa.Text(), nullable=True),
        sa.Column("artifacts", postgresql.JSONB(), nullable=True),
        sa.Column("verification_result", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["loop_run_id"], ["test_failure_loop_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_test_failure_loop_steps_loop_run_id", "test_failure_loop_steps", ["loop_run_id"])
    op.create_index("ix_test_failure_loop_steps_phase", "test_failure_loop_steps", ["phase"])


def downgrade() -> None:
    op.drop_index("ix_test_failure_loop_steps_phase", table_name="test_failure_loop_steps")
    op.drop_index("ix_test_failure_loop_steps_loop_run_id", table_name="test_failure_loop_steps")
    op.drop_table("test_failure_loop_steps")
    op.drop_index("ix_test_failure_loop_runs_current_phase", table_name="test_failure_loop_runs")
    op.drop_index("ix_test_failure_loop_runs_status", table_name="test_failure_loop_runs")
    op.drop_index("ix_test_failure_loop_runs_strategy", table_name="test_failure_loop_runs")
    op.drop_index("ix_test_failure_loop_runs_script_type", table_name="test_failure_loop_runs")
    op.drop_index("ix_test_failure_loop_runs_job_id", table_name="test_failure_loop_runs")
    op.drop_index("ix_test_failure_loop_runs_test_run_id", table_name="test_failure_loop_runs")
    op.drop_index("ix_test_failure_loop_runs_project_id", table_name="test_failure_loop_runs")
    op.drop_table("test_failure_loop_runs")
