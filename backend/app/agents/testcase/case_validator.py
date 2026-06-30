"""测试用例导出前校验：步骤/预期数量一致、禁止合并写法。"""

from __future__ import annotations

import re
from typing import Any

_NUMBERED_ITEM = re.compile(r"^\s*(\d+)[.、．]\s*", re.MULTILINE)
_MERGED_RANGE = re.compile(r"^\s*\d+\s*[-~至]\s*\d+", re.MULTILINE)
_FORBIDDEN_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"同正向"), "预期结果禁止写「同正向流程」等合并描述"),
    (re.compile(r"同上"), "禁止「同上」"),
    (re.compile(r"同步骤"), "禁止「同步骤」"),
    (re.compile(r"执行.{0,8}步骤\s*[\d~\-至]+"), "禁止「执行步骤 1~N」类引用"),
    (re.compile(r"重复步骤"), "禁止「重复步骤」"),
    (re.compile(r"参照.{0,12}(步骤|用例|TC-)"), "禁止参照其他用例/步骤"),
    (re.compile(r"以下.{0,6}同"), "禁止「以下同…」类合并预期"),
]


def _ensure_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _first_field(case: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key not in case:
            continue
        value = case[key]
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        if isinstance(value, (list, dict)) and not value:
            continue
        return value
    return None


def count_numbered_items(value: Any) -> int:
    """统计步骤或预期结果的条数（列表或带序号的字符串）。"""
    if value is None:
        return 0
    if isinstance(value, list):
        return len([item for item in value if str(item).strip()])
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return 0
        matches = _NUMBERED_ITEM.findall(text)
        if matches:
            return len(matches)
        lines = [line for line in text.splitlines() if line.strip()]
        return len(lines)
    return 0


_PRECONDITION_KEYS = (
    "preconditions",
    "precondition",
    "前置条件",
    "前提条件",
    "前提与约束",
    "前提和约束",
    "用例初始化",
)


def _preconditions_text(case: dict[str, Any]) -> str:
    """提取前置条件文本（用于非空校验）。"""
    value = _first_field(case, *_PRECONDITION_KEYS)
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts = [str(item).strip() for item in value if str(item).strip()]
        return "\n".join(parts)
    if isinstance(value, dict):
        return "\n".join(f"{k}: {v}" for k, v in value.items() if str(v).strip())
    return str(value).strip()


def _scan_forbidden_text(*texts: str) -> list[str]:
    issues: list[str] = []
    for text in texts:
        if not text:
            continue
        if _MERGED_RANGE.search(text):
            issues.append("禁止将多条步骤的预期合并为「1-5. …」或「1~5」等区间写法")
        for pattern, message in _FORBIDDEN_PATTERNS:
            if pattern.search(text):
                issues.append(message)
                break
    return issues


def validate_test_case(case: dict[str, Any], index: int = 1) -> list[str]:
    """校验单条用例，返回错误信息列表（空列表表示通过）。"""
    errors: list[str] = []
    case_id = str(
        _first_field(case, "id", "case_id", "用例编号", "用例标识") or f"第{index}条"
    ).strip()

    preconditions = _preconditions_text(case)
    if not preconditions:
        errors.append(
            f"{case_id}: 前置条件为空；请填写 preconditions / 前置条件 / 前提与约束 "
            "（编号列表，含账号、权限、基础数据等可准备项）"
        )

    steps = _first_field(case, "steps", "测试步骤", "操作步骤", "输入及操作")
    expected = _first_field(
        case,
        "expected_results",
        "expected",
        "预期结果",
        "期望结果",
        "期望结果与评估标准",
    )

    step_count = count_numbered_items(steps)
    expected_count = count_numbered_items(expected)

    if step_count == 0:
        errors.append(f"{case_id}: 测试步骤为空")
    if expected_count == 0:
        errors.append(f"{case_id}: 预期结果为空")
    if step_count and expected_count and step_count != expected_count:
        errors.append(
            f"{case_id}: 测试步骤 {step_count} 条与预期结果 {expected_count} 条不一致，"
            "必须为每一步写一条预期（导航步骤也需单独写，可用「成功打开目标页面」等具体描述）"
        )

    step_text = steps if isinstance(steps, str) else "\n".join(str(s) for s in _ensure_list(steps))
    expected_text = (
        expected
        if isinstance(expected, str)
        else "\n".join(str(e) for e in _ensure_list(expected))
    )
    for issue in _scan_forbidden_text(step_text, expected_text):
        errors.append(f"{case_id}: {issue}")

    return errors


def validate_test_cases(
    test_cases: list[dict[str, Any]],
    *,
    batch_size: int | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    校验**当前批次**用例（非全量）。全部通过时返回 (cases, None)；否则返回 ([], 错误说明)。

    与分批导出配合：仅拒绝本批写入，已成功 append 的批次不受影响。
    """
    all_errors: list[str] = []
    for idx, case in enumerate(test_cases, start=1):
        all_errors.extend(validate_test_case(case, idx))

    if all_errors:
        preview = "\n".join(f"- {e}" for e in all_errors[:12])
        extra = ""
        if len(all_errors) > 12:
            extra = f"\n…另有 {len(all_errors) - 12} 项问题"
        batch_note = ""
        if batch_size is not None:
            batch_note = (
                f"\n\n【分批说明】本次校验对象为本批 {batch_size} 条用例。"
                "请只修正本批中有问题的用例后，用相同 output_path、sheet_name、append=True 重试；"
                "已成功导出的 earlier 批次无需重复导出。"
            )
        return (
            [],
            "本批导出校验未通过，请修正后重新导出本批：\n"
            f"{preview}{extra}\n\n"
            "修正要求：每条用例须填写非空前置条件（preconditions/前置条件/前提与约束）；"
            "测试步骤与预期结果条数必须完全相等；"
            "禁止在预期结果中使用「1-5. 同正向流程」等合并写法；"
            "导航类步骤也须逐条写预期。"
            f"{batch_note}",
        )
    return test_cases, None
