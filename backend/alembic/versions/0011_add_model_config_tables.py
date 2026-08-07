"""add model config tables

Revision ID: 0011_model_config
Revises: df56d7c294cc
Create Date: 2026-07-15 00:00:00.000000+00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011_model_config"
down_revision: Union[str, None] = "df56d7c294cc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "model_providers",
        sa.Column("name", sa.String(length=100), nullable=False, comment="Name"),
        sa.Column("provider", sa.String(length=50), nullable=False, comment="Provider type"),
        sa.Column("api_endpoint", sa.String(length=500), nullable=False, comment="API endpoint"),
        sa.Column("api_key_cipher", sa.Text(), nullable=True, comment="Encrypted API key"),
        sa.Column("protocol_type", sa.String(length=50), nullable=False, comment="Protocol type"),
        sa.Column("api_version", sa.String(length=50), nullable=True, comment="API version"),
        sa.Column("remark", sa.String(length=500), nullable=True, comment="Remark"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Enabled"),
        sa.Column("sort", sa.Integer(), nullable=False, server_default=sa.text("0"), comment="Sort order"),
        sa.Column("id", sa.UUID(), nullable=False, comment="Primary key"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="Created at"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, comment="Updated at"),
        sa.PrimaryKeyConstraint("id"),
        comment="Model provider configuration",
    )
    op.create_table(
        "model_configs",
        sa.Column("provider_id", sa.UUID(), nullable=False, comment="Provider ID"),
        sa.Column("name", sa.String(length=100), nullable=False, comment="Display name"),
        sa.Column("model_id", sa.String(length=100), nullable=False, comment="Provider model ID"),
        sa.Column("context_window", sa.Integer(), nullable=True, comment="Context window"),
        sa.Column("max_output_tokens", sa.Integer(), nullable=True, comment="Max output tokens"),
        sa.Column("pool_group", sa.String(length=50), nullable=True, comment="Pool group"),
        sa.Column("default_temperature", sa.Float(), nullable=True, comment="Default temperature"),
        sa.Column("default_top_p", sa.Float(), nullable=True, comment="Default top_p"),
        sa.Column("timeout_sec", sa.Integer(), nullable=True, comment="Timeout seconds"),
        sa.Column("retry_count", sa.Integer(), nullable=True, comment="Retry count"),
        sa.Column("support_text", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Supports text"),
        sa.Column("support_image_input", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="Supports image input"),
        sa.Column("support_image_output", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="Supports image output"),
        sa.Column("support_tools", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Supports tools"),
        sa.Column("support_stream", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Supports stream"),
        sa.Column("support_code", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="Supports code"),
        sa.Column("support_long_text", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="Supports long text"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Enabled"),
        sa.Column("sort", sa.Integer(), nullable=False, server_default=sa.text("0"), comment="Sort order"),
        sa.Column("id", sa.UUID(), nullable=False, comment="Primary key"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="Created at"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, comment="Updated at"),
        sa.ForeignKeyConstraint(["provider_id"], ["model_providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "model_id", name="uq_model_provider_model_id"),
        comment="Model configuration",
    )
    op.create_index(op.f("ix_model_configs_provider_id"), "model_configs", ["provider_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_model_configs_provider_id"), table_name="model_configs")
    op.drop_table("model_configs")
    op.drop_table("model_providers")
