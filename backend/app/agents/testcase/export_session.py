"""
跨批次 Excel 导出会话管理

⚠️ 注意：此模块仅供智能体工具层使用

功能说明：
- 智能体生成测试用例时，支持分批导出到同一Excel文件
- 记住首次导出的文件路径，后续批次自动追加到相同文件
- 使用 LangGraph 的 thread_id 区分不同对话会话

使用场景：
- Phase 3 生成用例时分批调用 export_testcases_to_excel
- 第1批：append=False，记录 output_path
- 第2批起：append=True，从 session 获取相同 path

实现方式：
- 使用全局字典 _EXPORT_SESSION 存储路径（简单实现）
- key: thread_id，value: 文件绝对路径

未来优化：
- 考虑使用 Redis/MongoDB 存储会话状态
- 支持会话过期和自动清理
"""

from __future__ import annotations

from pathlib import Path

_EXPORT_SESSION: dict[str, str] = {}


def _session_key() -> str:
    try:
        from langgraph.config import get_config

        cfg = get_config() or {}
        configurable = cfg.get("configurable") or {}
        thread_id = configurable.get("thread_id") or configurable.get("checkpoint_id")
        if thread_id:
            return str(thread_id)
    except Exception:
        pass
    return "default"


def get_active_export_path() -> str | None:
    return _EXPORT_SESSION.get(_session_key())


def set_active_export_path(path: str | Path) -> str:
    resolved = str(Path(path).resolve())
    _EXPORT_SESSION[_session_key()] = resolved
    return resolved


def clear_active_export_path() -> None:
    _EXPORT_SESSION.pop(_session_key(), None)
