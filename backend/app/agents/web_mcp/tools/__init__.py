"""
Web Agent 工具模块

本目录包含所有 Web 测试智能体的工具定义，按功能分类组织。
"""


from .function_tools import (
    list_web_functions,
    get_function_details,
    list_web_sub_functions,
    get_sub_function_details,
    get_folder_structure,
    create_web_function,
    create_web_sub_function,
)
# noqa  MC8zOmFIVnBZMlhwdTRUbGphRG1zWjg2WTNCbWFBPT06NmUyMTI1NGQ=

from .test_artifacts_tools import (
    save_web_test_plan,
    save_web_test_cases,
    save_web_test_script,
    get_web_sub_function_artifacts,
    save_web_test_report,
    get_artifact_content,
)
# fmt: off  MS8zOmFIVnBZMlhwdTRUbGphRG1zWjg2WTNCbWFBPT06NmUyMTI1NGQ=

from .script_tools import (
    get_web_script_info,
    download_web_script,
    delete_web_script,
)

from .execution_tools import (
    execute_web_script,
    get_test_execution_status,
)
# pylint: disable  Mi8zOmFIVnBZMlhwdTRUbGphRG1zWjg2WTNCbWFBPT06NmUyMTI1NGQ=

__all__ = [
    # 功能管理工具
    "list_web_functions",
    "get_function_details",
    "list_web_sub_functions",
    "get_sub_function_details",
    "get_folder_structure",
    "create_web_function",
    "create_web_sub_function",

    # 测试成果物管理工具
    "save_web_test_plan",
    "save_web_test_cases",
    "save_web_test_script",
    "get_web_sub_function_artifacts",
    "save_web_test_report",
    "get_artifact_content",

    # 脚本管理工具
    "get_web_script_info",
    "download_web_script",
    "delete_web_script",

    # 脚本执行工具
    "execute_web_script",
    "get_test_execution_status",
]
