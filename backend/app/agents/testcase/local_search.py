"""轻量本地历史用例检索（无数据库持久化时的 P0 快速通道）。"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# 与 testcase agent 的 workspace 根目录一致
_AGENT_WORKSPACE = Path(__file__).resolve().parents[2] / "workspace"

_LOCAL_JSON_CANDIDATES = (
    _AGENT_WORKSPACE / "workspace" / "all_testcases.json",
    _AGENT_WORKSPACE / "all_testcases.json",
)

_EXPLORATION_DIR = _AGENT_WORKSPACE / "exploration"


def _salvage_json_array(text: str) -> list[dict[str, Any]] | None:
    """截断/损坏的 JSON 数组：保留到最后一个完整对象。"""
    marker = "\n  },"
    last = text.rfind(marker)
    if last == -1:
        return None
    repaired = text[: last + len("\n  }")] + "\n]"
    try:
        data = json.loads(repaired)
    except json.JSONDecodeError:
        return None
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return None


def _load_testcases_json() -> list[dict[str, Any]]:
    for path in _LOCAL_JSON_CANDIDATES:
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            salvaged = _salvage_json_array(text)
            if salvaged is not None:
                return salvaged
            continue
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
    return []


def _normalize(text: str) -> str:
    return "".join(text.split()).lower()


def _match_case(
    case: dict[str, Any],
    module: str,
    action: str,
) -> bool:
    module_n = _normalize(module) if module else ""
    action_n = _normalize(action) if action else ""
    if not module_n and not action_n:
        return False

    haystack_parts = []
    for key in ("所属模块", "用例名称", "用例说明", "用例标识"):
        value = case.get(key)
        if value:
            haystack_parts.append(str(value))
    haystack = _normalize("".join(haystack_parts))

    if module_n and module_n not in haystack:
        return False
    if action_n and action_n not in haystack:
        return False
    return True


def _summarize_case(case: dict[str, Any]) -> dict[str, str]:
    return {
        "用例标识": str(case.get("用例标识", "")),
        "所属模块": str(case.get("所属模块", "")),
        "用例名称": str(case.get("用例名称", "")),
        "优先级": str(case.get("优先级", "")),
    }


def _load_exploration_hint(module: str) -> dict[str, Any] | None:
    if not module or not module.strip():
        return None
    safe = module.strip()
    for name in (f"{safe}.json", f"{safe.replace(' ', '_')}.json"):
        path = _EXPLORATION_DIR / name
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if isinstance(data, dict):
            return {
                "path": str(path),
                "module": data.get("module", safe),
                "navigation_path": data.get("navigation_path"),
                "primary_actions": data.get("primary_actions"),
                "form_fields_count": len(data.get("form_fields") or []),
            }
    return None


def search_local_testcases_impl(
    module: str = "",
    action: str = "",
    limit: int = 5,
) -> dict[str, Any]:
    """按模块/操作关键字检索本地 JSON 用例摘要。"""
    limit = max(1, min(int(limit), 20))
    all_cases = _load_testcases_json()
    source_path = next(
        (str(p) for p in _LOCAL_JSON_CANDIDATES if p.is_file()),
        None,
    )

    if not module.strip() and not action.strip():
        return {
            "source": source_path,
            "total_in_file": len(all_cases),
            "matched_count": 0,
            "matches": [],
            "exploration_hint": None,
            "message": "请至少提供 module 或 action 之一。",
        }

    matches = [_summarize_case(c) for c in all_cases if _match_case(c, module, action)]
    matches = matches[:limit]

    # 无精确命中时，仅按模块放宽（便于「编辑用户」参考「新增用户」同模块用例）
    if not matches and module.strip():
        module_only = [
            _summarize_case(c)
            for c in all_cases
            if _normalize(module) in _normalize(
                "".join(
                    str(c.get(k, ""))
                    for k in ("所属模块", "用例名称", "用例说明")
                )
            )
        ]
        matches = module_only[:limit]

    return {
        "source": source_path,
        "total_in_file": len(all_cases),
        "matched_count": len(matches),
        "matches": matches,
        "exploration_hint": _load_exploration_hint(module),
        "message": (
            f"命中 {len(matches)} 条本地用例摘要。"
            if matches
            else "未命中本地用例；可依赖需求原文或最小 URL 探索。"
        ),
    }
