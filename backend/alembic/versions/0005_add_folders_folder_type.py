"""add folders folder_type column

Revision ID: 0005_add_folders_folder_type
Revises: 0004_add_pentest_tables
Create Date: 2026-06-04 00:00:00

folders 表缺少 folder_type 列（对应 FolderType 枚举），本迁移补充该列。
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# pylint: disable

revision: str = "0005_add_folders_folder_type"
down_revision: Union[str, None] = "0004_add_pentest_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) 创建 foldertype 枚举类型（若不存在）
    op.execute(
        sa.text(
            "DO $$ BEGIN "
            "CREATE TYPE foldertype AS ENUM "
            "('test_case', 'api_test', 'web_test', 'scenario_test'); "
            "EXCEPTION WHEN duplicate_object THEN null; END $$;"
        )
    )

    # 2) 为 folders 表添加 folder_type 列，默认值 test_case
    op.add_column(
        "folders",
        sa.Column(
            "folder_type",
            sa.Enum(
                "test_case", "api_test", "web_test", "scenario_test",
                name="foldertype",
                create_type=False,
            ),
            nullable=False,
            server_default="test_case",
        ),
    )


def downgrade() -> None:
    op.drop_column("folders", "folder_type")
    op.execute(sa.text("DROP TYPE IF EXISTS foldertype"))
