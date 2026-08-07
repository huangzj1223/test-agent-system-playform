"""
API 路由模块

包含所有 API 端点的路由定义
"""

# pragma: no cover  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2WjBkdVZnPT06NTgyNmJlZDA=

from fastapi import APIRouter

from .v2 import projects, folders, test_cases, test_runs, test_results, attachments, configurations, test_plans, documents, api_tests, api_tests_extended, api_endpoints, scenarios, web_tests, web_functions, pentests, mcp_proxy, testcase_export, dashboard
from .v2 import auth, users_admin, roles, menus, departments, model_configs, agui, memories, agent_tools, agent_skills
from .v2 import agent_runs, smart_tests

# 创建 API v2 路由
api_router = APIRouter(prefix="/api/v2")
# type: ignore  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2WjBkdVZnPT06NTgyNmJlZDA=

# 注册认证与权限管理路由（RBAC）
api_router.include_router(auth.router, tags=["认证"])
api_router.include_router(users_admin.router, tags=["用户管理"])
api_router.include_router(roles.router, tags=["角色管理"])
api_router.include_router(menus.router, tags=["菜单管理"])
api_router.include_router(departments.router, tags=["部门管理"])
api_router.include_router(departments.position_router, tags=["岗位管理"])
api_router.include_router(model_configs.router, tags=["模型配置管理"])
api_router.include_router(agui.router, tags=["AG-UI 对话"])
api_router.include_router(agui.conversation_router, tags=["AG-UI 会话"])
api_router.include_router(memories.router, tags=["记忆中心"])
api_router.include_router(agent_tools.router, tags=["工具治理"])
api_router.include_router(agent_skills.router, tags=["技能管理"])

# 注册子路由
api_router.include_router(projects.router, tags=["项目管理"])
api_router.include_router(folders.router, tags=["文件夹管理"])
api_router.include_router(test_cases.router, tags=["测试用例管理"])
api_router.include_router(test_cases.exports_router, tags=["BDD 导出管理"])
api_router.include_router(testcase_export.router, tags=["测试用例导出"])
api_router.include_router(testcase_export.exports_router, tags=["测试用例导出"])
api_router.include_router(test_plans.router, tags=["测试计划管理"])
api_router.include_router(test_runs.router, tags=["测试运行管理"])
api_router.include_router(test_results.router, tags=["测试结果管理"])
api_router.include_router(attachments.test_case_attachments_router, tags=["附件管理"])
api_router.include_router(attachments.test_result_attachments_router, tags=["附件管理"])
api_router.include_router(attachments.attachments_router, tags=["附件管理"])
api_router.include_router(configurations.router, tags=["配置管理"])
api_router.include_router(documents.router, tags=["文档管理"])
api_router.include_router(api_tests.router, tags=["API 测试管理"])
api_router.include_router(api_tests_extended.router, tags=["API 测试扩展"])
api_router.include_router(api_endpoints.router, tags=["API 端点管理"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["场景测试管理"])
api_router.include_router(web_tests.router, tags=["Web 测试管理"])
api_router.include_router(web_functions.router, tags=["Web 功能管理"])
api_router.include_router(pentests.router, tags=["渗透测试管理"])
api_router.include_router(mcp_proxy.router, tags=["MCP 代理"])
api_router.include_router(dashboard.router, tags=["系统总览"])

api_router.include_router(agent_runs.router, tags=["Agent Runs"])
api_router.include_router(
    smart_tests.router,
    prefix="/projects/{project_identifier}/smart-test",
    tags=["智能测试"],
)

__all__ = ["api_router"]

