#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试导出器（跳过 __init__.py）
"""

import sys
from pathlib import Path

# 模拟测试用例数据
test_cases = [
    {
        "id": "TC-001",
        "title": "Test Login",
        "name": "Test Login",
        "module": "User Management",
        "type": "functional",
        "priority": "high",
        "preconditions": "System is running",
        "steps": [
            {"seq": 1, "action": "Open login page"},
            {"seq": 2, "action": "Enter credentials"},
            {"seq": 3, "action": "Click login"},
        ],
        "expected_results": [
            "Login page opened",
            "Credentials entered",
            "Login successful",
        ],
    },
]

print("Testing exporters...")

# 直接导入导出函数（避免触发 __init__.py）
excel_module = Path(__file__).parent / "app/agents/testcase/excel_exporter.py"
spec = __import__('importlib.util').util.spec_from_file_location("excel_exporter", excel_module)
excel_exporter = __import__('importlib.util').util.module_from_spec(spec)
spec.loader.exec_module(excel_exporter)

print("[1/3] Testing Excel export...")
try:
    excel_path = excel_exporter.export_test_cases_to_excel(
        test_cases,
        "exports/test_simple.xlsx",
        "Test Cases"
    )
    print(f"SUCCESS: Excel exported to {excel_path}")
    if Path(excel_path).exists():
        print(f"File size: {Path(excel_path).stat().st_size} bytes")
except Exception as e:
    print(f"FAILED: {e}")

print("\nTest completed!")