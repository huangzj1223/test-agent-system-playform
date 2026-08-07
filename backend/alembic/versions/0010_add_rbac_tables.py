"""add rbac tables

新增 RBAC 相关表：菜单、角色、部门、岗位及关联表，并为 users 增加
认证/权限相关字段。仅包含本次特性所需变更，不含无关的历史字段漂移。

Revision ID: df56d7c294cc
Revises: 0009_attachment_artifacts
Create Date: 2026-07-14 10:18:48.121553+00:00

回滚方式：`alembic downgrade 0009_attachment_artifacts`，将删除全部
sys_* 表并移除 users 上新增列（不影响既有数据）。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'df56d7c294cc'
down_revision: Union[str, None] = '0009_attachment_artifacts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 部门表
    op.create_table(
        'sys_departments',
        sa.Column('name', sa.String(length=100), nullable=False, comment='部门名称'),
        sa.Column('parent_id', sa.UUID(), nullable=True, comment='父级部门 ID'),
        sa.Column('dept_type', sa.String(length=20), nullable=True, comment='部门类型'),
        sa.Column('leader', sa.String(length=50), nullable=True, comment='负责人'),
        sa.Column('phone', sa.String(length=20), nullable=True, comment='联系电话'),
        sa.Column('order_num', sa.Integer(), nullable=False, comment='排序号（升序）'),
        sa.Column('status', sa.Integer(), nullable=False, comment='状态 1=启用 0=禁用'),
        sa.Column('id', sa.UUID(), nullable=False, comment='主键 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='更新时间'),
        sa.ForeignKeyConstraint(['parent_id'], ['sys_departments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        comment='系统部门表',
    )
    op.create_index(op.f('ix_sys_departments_parent_id'), 'sys_departments', ['parent_id'], unique=False)
    # 菜单表
    op.create_table(
        'sys_menus',
        sa.Column('parent_id', sa.UUID(), nullable=True, comment='父级菜单 ID'),
        sa.Column('name', sa.String(length=100), nullable=False, comment='菜单名称'),
        sa.Column('router', sa.String(length=200), nullable=True, comment='前端路由路径'),
        sa.Column('perms', sa.String(length=200), nullable=True, comment='权限标识（如 system:user:list）'),
        sa.Column('menu_type', sa.Integer(), nullable=False, comment='类型 0=目录 1=菜单 2=按钮'),
        sa.Column('icon', sa.String(length=100), nullable=True, comment='图标'),
        sa.Column('order_num', sa.Integer(), nullable=False, comment='排序号（升序）'),
        sa.Column('view_path', sa.String(length=200), nullable=True, comment='视图组件路径'),
        sa.Column('keep_alive', sa.Integer(), nullable=False, comment='是否缓存 1=是 0=否'),
        sa.Column('is_show', sa.Integer(), nullable=False, comment='是否显示 1=是 0=否'),
        sa.Column('id', sa.UUID(), nullable=False, comment='主键 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='更新时间'),
        sa.ForeignKeyConstraint(['parent_id'], ['sys_menus.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        comment='系统菜单表',
    )
    op.create_index(op.f('ix_sys_menus_parent_id'), 'sys_menus', ['parent_id'], unique=False)
    op.create_index(op.f('ix_sys_menus_perms'), 'sys_menus', ['perms'], unique=False)
    # 岗位表
    op.create_table(
        'sys_positions',
        sa.Column('name', sa.String(length=50), nullable=False, comment='岗位名称'),
        sa.Column('description', sa.String(length=200), nullable=True, comment='岗位描述'),
        sa.Column('order_num', sa.Integer(), nullable=False, comment='排序号（升序）'),
        sa.Column('status', sa.Integer(), nullable=False, comment='状态 1=启用 0=禁用'),
        sa.Column('id', sa.UUID(), nullable=False, comment='主键 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='更新时间'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        comment='系统岗位表',
    )
    # 角色表
    op.create_table(
        'sys_roles',
        sa.Column('name', sa.String(length=100), nullable=False, comment='角色名称'),
        sa.Column('label', sa.String(length=100), nullable=True, comment='角色标识（唯一）'),
        sa.Column('remark', sa.String(length=500), nullable=True, comment='备注'),
        sa.Column('status', sa.Integer(), nullable=False, comment='状态 1=启用 0=禁用'),
        sa.Column('id', sa.UUID(), nullable=False, comment='主键 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='更新时间'),
        sa.PrimaryKeyConstraint('id'),
        comment='系统角色表',
    )
    op.create_index(op.f('ix_sys_roles_label'), 'sys_roles', ['label'], unique=True)
    # 角色-菜单关联
    op.create_table(
        'sys_role_menus',
        sa.Column('role_id', sa.UUID(), nullable=False, comment='角色 ID'),
        sa.Column('menu_id', sa.UUID(), nullable=False, comment='菜单 ID'),
        sa.Column('id', sa.UUID(), nullable=False, comment='主键 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='更新时间'),
        sa.ForeignKeyConstraint(['menu_id'], ['sys_menus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['sys_roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'menu_id', name='uq_role_menu'),
        comment='角色-菜单关联表',
    )
    # 用户-角色关联
    op.create_table(
        'sys_user_roles',
        sa.Column('user_id', sa.UUID(), nullable=False, comment='用户 ID'),
        sa.Column('role_id', sa.UUID(), nullable=False, comment='角色 ID'),
        sa.Column('id', sa.UUID(), nullable=False, comment='主键 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, comment='更新时间'),
        sa.ForeignKeyConstraint(['role_id'], ['sys_roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
        comment='用户-角色关联表',
    )
    # users 新增字段
    op.add_column('users', sa.Column('password_v', sa.Integer(), server_default=sa.text('1'), nullable=False, comment='密码版本号（改密后旧 token 失效）'))
    op.add_column('users', sa.Column('status', sa.Integer(), server_default=sa.text('1'), nullable=False, comment='状态 1=启用 0=禁用'))
    op.add_column('users', sa.Column('name', sa.String(length=100), nullable=True, comment='姓名'))
    op.add_column('users', sa.Column('nick_name', sa.String(length=100), nullable=True, comment='昵称'))
    op.add_column('users', sa.Column('head_img', sa.String(length=500), nullable=True, comment='头像 URL'))
    op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True, comment='手机号'))
    op.add_column('users', sa.Column('remark', sa.String(length=500), nullable=True, comment='备注'))
    op.add_column('users', sa.Column('department_id', sa.UUID(), nullable=True, comment='所属部门 ID'))
    op.add_column('users', sa.Column('position_id', sa.UUID(), nullable=True, comment='岗位 ID'))
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_foreign_key('fk_users_position', 'users', 'sys_positions', ['position_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_users_department', 'users', 'sys_departments', ['department_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_users_department', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_position', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    for col in ('position_id', 'department_id', 'remark', 'phone', 'head_img', 'nick_name', 'name', 'status', 'password_v'):
        op.drop_column('users', col)
    op.drop_table('sys_user_roles')
    op.drop_table('sys_role_menus')
    op.drop_index(op.f('ix_sys_roles_label'), table_name='sys_roles')
    op.drop_table('sys_roles')
    op.drop_table('sys_positions')
    op.drop_index(op.f('ix_sys_menus_perms'), table_name='sys_menus')
    op.drop_index(op.f('ix_sys_menus_parent_id'), table_name='sys_menus')
    op.drop_table('sys_menus')
    op.drop_index(op.f('ix_sys_departments_parent_id'), table_name='sys_departments')
    op.drop_table('sys_departments')
