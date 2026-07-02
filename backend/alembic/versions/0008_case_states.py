"""add current test case state enum values

Revision ID: 0008_case_states
Revises: 0007_test_failure_loops
Create Date: 2026-07-02 11:26:00.000000
"""

from alembic import op


revision = "0008_case_states"
down_revision = "0007_test_failure_loops"
branch_labels = None
depends_on = None


STATE_VALUES = (
    "new",
    "review_pending",
    "reviewed",
    "not_run",
    "passed",
    "failed",
    "blocked",
    "skipped",
)


def upgrade() -> None:
    for value in STATE_VALUES:
        op.execute(f"ALTER TYPE testcasestate ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL cannot safely drop enum values in-place. Keeping the values is
    # safer than rewriting tables that may already contain the newer states.
    pass