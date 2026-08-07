"""
测试导出功能的简单脚本

运行方式：
cd backend
python -m pytest test_export_api.py -v
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.testcase_export_service import TestCaseExportService
from app.config.database import async_session_factory, get_mongodb


def test_export():
    """测试导出服务"""
    print("=" * 60)
    print("测试导出服务")
    print("=" * 60)

    # 模拟测试用例数据
    test_cases = [
        {
            "id": "TC-001",
            "title": "测试登录功能",
            "name": "测试登录功能",
            "module": "用户管理",
            "type": "functional",
            "priority": "high",
            "preconditions": "1. 系统正常运行\n2. 用户账号已创建",
            "steps": [
                {"seq": 1, "action": "打开登录页面"},
                {"seq": 2, "action": "输入用户名和密码"},
                {"seq": 3, "action": "点击登录按钮"},
            ],
            "expected_results": [
                "成功打开登录页面",
                "用户名和密码输入成功",
                "登录成功，跳转到首页",
            ],
            "remarks": "核心功能测试",
        },
        {
            "id": "TC-002",
            "title": "测试用户注册",
            "name": "测试用户注册",
            "module": "用户管理",
            "type": "functional",
            "priority": "medium",
            "preconditions": "系统正常运行",
            "steps": [
                {"seq": 1, "action": "打开注册页面"},
                {"seq": 2, "action": "填写注册信息"},
                {"seq": 3, "action": "点击注册按钮"},
            ],
            "expected_results": [
                "成功打开注册页面",
                "注册信息填写成功",
                "注册成功，跳转到登录页面",
            ],
            "remarks": "基础功能测试",
        },
    ]

    # 测试 Excel 导出
    print("\n[1/3] 测试 Excel 导出...")
    try:
        from app.agents.testcase.excel_exporter import export_test_cases_to_excel
        excel_path = export_test_cases_to_excel(
            test_cases,
            "exports/test_export.xlsx",
            "测试用例"
        )
        print(f"✅ Excel 导出成功: {excel_path}")

        # 验证文件存在
        if Path(excel_path).exists():
            print(f"✅ 文件已创建: {Path(excel_path).stat().st_size} bytes")
        else:
            print(f"❌ 文件未找到")
    except Exception as e:
        print(f"❌ Excel 导出失败: {e}")
        import traceback
        traceback.print_exc()

    # 测试 Word 导出
    print("\n[2/3] 测试 Word 导出...")
    try:
        from app.agents.testcase.docx_exporter import export_test_cases_to_docx
        word_path = export_test_cases_to_docx(
            test_cases,
            "exports/test_export.docx"
        )
        print(f"✅ Word 导出成功: {word_path}")

        if Path(word_path).exists():
            print(f"✅ 文件已创建: {Path(word_path).stat().st_size} bytes")
        else:
            print(f"❌ 文件未找到")
    except Exception as e:
        print(f"❌ Word 导出失败: {e}")
        import traceback
        traceback.print_exc()

    # 测试 JSON 导出
    print("\n[3/3] 测试 JSON 导出...")
    try:
        from app.agents.testcase.json_exporter import export_test_cases_to_json
        json_path = export_test_cases_to_json(
            test_cases,
            "exports/test_export.json"
        )
        print(f"✅ JSON 导出成功: {json_path}")

        if Path(json_path).exists():
            print(f"✅ 文件已创建: {Path(json_path).stat().st_size} bytes")
        else:
            print(f"❌ 文件未找到")
    except Exception as e:
        print(f"❌ JSON 导出失败: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)


if __name__ == "__main__":
    test_export()
