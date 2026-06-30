"""多轮对话中的任务边界：区分「新任务」与「澄清回复」。"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.middleware.clarification_gate import (
    CLARIFICATION_MARKER,
    content_has_open_clarification,
    is_system_human_message,
)

CLARIFICATION_CONTINUE_PROMPT = (
    f"{CLARIFICATION_MARKER} 用户已补充澄清信息。"
    "请更新 Phase 1 产出（将「## ⚠️ 需澄清问题」标为已解决或「无」），"
    "立即进入 Phase 2 测试策略，再继续 Phase 3 用例设计与分批导出。"
    "禁止跳过 Phase 2 直接导出；禁止复用上一轮已完成任务中的用例当作本轮交付。"
)


def is_clarification_resolved_prompt(message: HumanMessage) -> bool:
    return CLARIFICATION_MARKER in str(message.content or "")


def _real_human_indices(messages: list) -> list[int]:
    return [
        i
        for i, msg in enumerate(messages)
        if isinstance(msg, HumanMessage) and not is_system_human_message(msg)
    ]


def _segment_had_delivery(messages: list) -> bool:
    """片段内是否已有测试用例导出（视为上一轮交付）。"""
    for msg in messages:
        if isinstance(msg, ToolMessage):
            name = (getattr(msg, "name", "") or "").lower()
            if "export_testcases" in name:
                return True
    return False


def _segment_has_completed_workflow(messages: list) -> bool:
    """片段内是否出现过完整端到端交付（导出 + 全部 Phase 完成）。"""
    if _segment_had_delivery(messages):
        return True
    for msg in messages:
        if isinstance(msg, ToolMessage):
            name = (getattr(msg, "name", "") or "").lower()
            content = str(getattr(msg, "content", "") or "")
            if "write_todos" in name:
                try:
                    data = json.loads(content)
                    todos = data if isinstance(data, list) else data.get("todos", [])
                    if todos and all(
                        str(item.get("status", "")).lower() == "completed"
                        for item in todos
                    ):
                        return True
                except Exception:
                    if content.count('"completed"') >= 5:
                        return True
        if isinstance(msg, AIMessage) and "所有任务已完成" in str(msg.content or ""):
            return True
    return False


def _is_clarification_reply(messages: list, human_idx: int) -> bool:
    """该 HumanMessage 是否为对 Phase 1 澄清问题的回复。"""
    for idx in range(human_idx - 1, -1, -1):
        msg = messages[idx]
        if isinstance(msg, AIMessage):
            return content_has_open_clarification(str(msg.content or ""))
        if isinstance(msg, HumanMessage) and not is_system_human_message(msg):
            return False
    return False


def find_task_segment_start(messages: list) -> int:
    """当前任务片段起始消息下标（含该 HumanMessage）。"""
    if not messages:
        return 0

    human_indices = _real_human_indices(messages)
    if not human_indices:
        return 0

    last_human_idx = human_indices[-1]

    if _is_clarification_reply(messages, last_human_idx):
        for idx in reversed(human_indices[:-1]):
            return idx
        return last_human_idx

    if len(human_indices) == 1:
        return human_indices[0]

    prev_human_idx = human_indices[-2]
    between = messages[prev_human_idx + 1 : last_human_idx]
    if _segment_has_completed_workflow(between):
        return last_human_idx

    return human_indices[0]


def current_task_messages(messages: list) -> list:
    """仅返回当前任务片段内的消息（忽略上一轮已完成任务的历史）。"""
    start = find_task_segment_start(messages)
    return messages[start:]


def is_new_task_turn(messages: list, existing_todos: list[dict[str, Any]] | None) -> bool:
    """最后一条真实用户消息是否开启了一个新任务（非澄清回复）。"""
    if not messages:
        return False

    human_indices = _real_human_indices(messages)
    if not human_indices:
        return False

    last_human_idx = human_indices[-1]
    if messages[-1] is not messages[last_human_idx]:
        return False

    if _is_clarification_reply(messages, last_human_idx):
        return False

    if not existing_todos:
        return len(human_indices) > 1

    if len(human_indices) == 1:
        return False

    prev_human_idx = human_indices[-2]
    between = messages[prev_human_idx + 1 : last_human_idx]
    if _segment_has_completed_workflow(between):
        return True

    if not all(str(item.get("status", "")).lower() == "completed" for item in existing_todos):
        return False

    return False


def clarification_just_resolved(messages: list) -> bool:
    """用户刚回复澄清问题，应继续 Phase 2+。"""
    human_indices = _real_human_indices(messages)
    if not human_indices:
        return False

    last_human_idx = human_indices[-1]
    if messages[-1] is not messages[last_human_idx]:
        return False

    return _is_clarification_reply(messages, last_human_idx)
