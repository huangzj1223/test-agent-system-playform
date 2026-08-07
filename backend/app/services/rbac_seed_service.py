"""
RBAC 初始化种子

应用启动时幂等初始化：内置菜单、超管角色、默认管理员账号。
参考蓝本：CESHI0701 server/prisma/seed.ts、common/seed.service.ts
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.models.menu import Menu
from app.models.role import Role, RoleMenu, UserRole
from app.models.user import User
from app.security.security_utils import hash_password

# 内置菜单定义：(name, router, perms, menu_type, icon, order_num)
# menu_type: 0=目录 1=菜单 2=按钮
_BUILTIN_MENUS: list[dict] = [
    {"name": "系统管理", "router": "/admin", "perms": None, "menu_type": 0, "icon": "Settings", "order_num": 90},
    {"name": "用户管理", "router": "/admin/users", "perms": "system:user:list", "menu_type": 1, "icon": "Users", "order_num": 91},
    {"name": "角色管理", "router": "/admin/roles", "perms": "system:role:list", "menu_type": 1, "icon": "Shield", "order_num": 92},
    {"name": "菜单管理", "router": "/admin/menus", "perms": "system:menu:list", "menu_type": 1, "icon": "Menu", "order_num": 93},
    {"name": "部门管理", "router": "/admin/departments", "perms": "system:dept:list", "menu_type": 1, "icon": "Building", "order_num": 94},
    {"name": "模型配置", "router": "/admin/models", "perms": "ai:model:write", "menu_type": 1, "icon": "Cpu", "order_num": 95},
    {"name": "记忆中心", "router": "/memory", "perms": "ai:memory:write", "menu_type": 1, "icon": "Brain", "order_num": 96},
    {"name": "工具治理", "router": "/tools", "perms": "ai:tool:write", "menu_type": 1, "icon": "Wrench", "order_num": 97},
    {"name": "技能管理", "router": "/skills", "perms": "ai:skill:write", "menu_type": 1, "icon": "Sparkles", "order_num": 98},
]


async def init_rbac(session: AsyncSession) -> None:
    """幂等初始化 RBAC 基础数据。"""
    # 1. 内置菜单（按 perms/name 判存）
    menu_ids: list = []
    for m in _BUILTIN_MENUS:
        existing = await session.scalar(
            select(Menu).where(Menu.name == m["name"])
        )
        if existing:
            menu_ids.append(existing.id)
            continue
        menu = Menu(**m)
        session.add(menu)
        await session.flush()
        menu_ids.append(menu.id)

    # 2. 超管角色
    admin_role = await session.scalar(select(Role).where(Role.label == "admin"))
    if not admin_role:
        admin_role = Role(name="超级管理员", label="admin", remark="内置超管角色", status=1)
        session.add(admin_role)
        await session.flush()

    # 超管绑定全部菜单
    for menu_id in menu_ids:
        exists = await session.scalar(
            select(RoleMenu).where(
                RoleMenu.role_id == admin_role.id, RoleMenu.menu_id == menu_id
            )
        )
        if not exists:
            session.add(RoleMenu(role_id=admin_role.id, menu_id=menu_id))

    # 3. 默认管理员账号
    #    优先按用户名命中；否则复用已存在的默认邮箱用户（开发环境 ensure_default_user
    #    可能已用该邮箱创建占位账号），将其升级为可登录的管理员，避免邮箱唯一约束冲突。
    admin_user = await session.scalar(
        select(User).where(User.username == settings.default_admin_username)
    )
    if not admin_user:
        admin_user = await session.scalar(
            select(User).where(User.email == settings.default_user_email)
        )
    if not admin_user:
        admin_user = User(
            username=settings.default_admin_username,
            email=settings.default_user_email,
            password_hash=hash_password(settings.default_admin_password),
            name="管理员",
            status=1,
            is_active=True,
            password_v=1,
        )
        session.add(admin_user)
        await session.flush()
    elif not admin_user.password_hash or admin_user.password_hash == "not_used_for_dev":
        # 占位账号：补齐用户名与可用密码，使其可正常登录
        admin_user.username = settings.default_admin_username
        admin_user.password_hash = hash_password(settings.default_admin_password)
        admin_user.status = 1
        admin_user.is_active = True
        admin_user.password_v = admin_user.password_v or 1
        await session.flush()

    # 管理员绑定超管角色
    ur_exists = await session.scalar(
        select(UserRole).where(
            UserRole.user_id == admin_user.id, UserRole.role_id == admin_role.id
        )
    )
    if not ur_exists:
        session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))

    await session.commit()
