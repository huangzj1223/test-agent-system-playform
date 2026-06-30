"""
文件夹类型枚举
"""

# type: ignore  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2UjFOSGFBPT06ZGIxMjI5YTA=

from enum import Enum

class FolderType(str, Enum):
    """文件夹类型"""
    TEST_CASE = "test_case"  # 测试用例文件夹
    API_TEST = "api_test"    # API测试文件夹
    WEB_TEST = "web_test"    # Web测试文件夹
    SCENARIO_TEST = "scenario_test"  # 场景测试文件夹
# type: ignore  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2UjFOSGFBPT06ZGIxMjI5YTA=
