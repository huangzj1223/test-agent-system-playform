"""
Web Agent 工具注册表

工具分类：
1. 功能管理工具：Web功能和子功能定义和管理（数据库操作）
2. 成果物工具：测试计划、用例、脚本的存储管理（MinIO 操作）
3. 脚本工具：脚本下载和管理（从 MinIO 下载到 MCP 测试目录）
4. 执行工具：测试运行和结果解析（在 MCP 测试目录中执行）

注意：MCP 工具（web_planner, web_generator, web_healer）
在 agent.py 的 make_agent() 中异步加载，不在此处定义。
"""


from typing import List
from langchain_core.tools import BaseTool
# fmt: off  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2WWtOVlRnPT06YzY0NjkxNTE=


# =============================================================================
# 功能管理工具
# =============================================================================

from app.agents.web_mcp.tools.function_tools import (
    list_web_functions,
    get_function_details,
    list_web_sub_functions,
    get_sub_function_details,
    get_folder_structure,
    create_web_function,
    create_web_sub_function
)


# =============================================================================
# 测试成果物管理工具
# =============================================================================
# pragma: no cover  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2WWtOVlRnPT06YzY0NjkxNTE=

from app.agents.web_mcp.tools.test_artifacts_tools import (
    save_web_test_plan,
    save_web_test_cases,
    save_web_test_script,
    get_web_sub_function_artifacts,
    save_web_test_report,
    get_artifact_content
)


# =============================================================================
# 脚本工具（从 MinIO 下载到 MCP 测试目录）
# =============================================================================

from app.agents.web_mcp.tools.script_tools import (
    get_web_script_info,
    download_web_script,
    delete_web_script
)


# =============================================================================
# 执行工具（在 MCP 测试目录中执行脚本）
# =============================================================================

from app.agents.web_mcp.tools.execution_tools import (
    execute_web_script,
    get_test_execution_status
)


# =============================================================================
# 工具集合
# =============================================================================

def get_local_tools() -> List[BaseTool]:
    """
    获取所有本地工具列表。

    MCP 工具在 agent.py 中异步加载，此处只返回本地工具。
    """
    return [
        # 功能管理
        list_web_functions,
        get_function_details,
        list_web_sub_functions,
        get_sub_function_details,
        get_folder_structure,
        create_web_function,
        create_web_sub_function,

        # 测试成果物管理
        save_web_test_plan,
        save_web_test_cases,
        save_web_test_script,
        get_web_sub_function_artifacts,
        save_web_test_report,
        get_artifact_content,

        # 脚本工具
        get_web_script_info,
        download_web_script,
        delete_web_script,

        # 执行工具
        execute_web_script,
        get_test_execution_status,
    ]
# type: ignore  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2WWtOVlRnPT06YzY0NjkxNTE=

# pylint: disable  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2WWtOVlRnPT06YzY0NjkxNTE=

# =============================================================================
# 工具分类导出（供其他模块使用）
# =============================================================================

FUNCTION_TOOLS = [
    list_web_functions,
    get_function_details,
    list_web_sub_functions,
    get_sub_function_details,
    get_folder_structure,
    create_web_function,
    create_web_sub_function,
]

ARTIFACT_TOOLS = [
    save_web_test_plan,
    save_web_test_cases,
    save_web_test_script,
    get_web_sub_function_artifacts,
    save_web_test_report,
    get_artifact_content,
]

SCRIPT_TOOLS = [
    get_web_script_info,
    download_web_script,
    delete_web_script,
]

EXECUTION_TOOLS = [
    execute_web_script,
    get_test_execution_status,
]
