"""add API and Web attachment artifact entity types

Revision ID: 0009_attachment_artifacts
Revises: 0008_case_states
Create Date: 2026-07-04 10:15:00.000000
"""

from alembic import op


revision = "0009_attachment_artifacts"
down_revision = "0008_case_states"
branch_labels = None
depends_on = None


ATTACHMENT_ENTITY_TYPES = (
    "API_ENDPOINT",
    "API_TEST_PLAN",
    "API_TEST_CASE",
    "API_TEST_SCRIPT",
    "API_TEST_REPORT",
    "WEB_PAGE",
    "WEB_TEST_PLAN",
    "WEB_TEST_CASE",
    "WEB_TEST_SCRIPT",
    "WEB_TEST_REPORT",
)


def upgrade() -> None:
    for value in ATTACHMENT_ENTITY_TYPES:
        op.execute(f"ALTER TYPE attachmententitytype ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL cannot safely drop enum values in-place. Keep the values to
    # avoid rewriting tables that may already reference generated artifacts.
    pass
