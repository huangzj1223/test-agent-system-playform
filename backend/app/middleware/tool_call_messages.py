"""工具调用与 ToolMessage 配对：检测未响应的 tool_calls 并修复发往模型的消息序列。"""

from __future__ import annotations

from langchain_core.messages import AIMessage, ToolMessage


def extract_tool_call_ids(message: AIMessage) -> set[str]:
    ids: set[str] = set()
    for tool_call in getattr(message, "tool_calls", None) or []:
        tool_call_id = (
            tool_call.get("id") if isinstance(tool_call, dict) else getattr(tool_call, "id", None)
        )
        if tool_call_id:
            ids.add(str(tool_call_id))

    for tool_call in getattr(message, "invalid_tool_calls", None) or []:
        tool_call_id = (
            tool_call.get("id") if isinstance(tool_call, dict) else getattr(tool_call, "id", None)
        )
        if tool_call_id:
            ids.add(str(tool_call_id))

    for tool_call in (getattr(message, "additional_kwargs", None) or {}).get("tool_calls") or []:
        tool_call_id = (
            tool_call.get("id") if isinstance(tool_call, dict) else getattr(tool_call, "id", None)
        )
        if tool_call_id:
            ids.add(str(tool_call_id))
    return ids


def ai_message_has_tool_calls(message: AIMessage) -> bool:
    if extract_tool_call_ids(message):
        return True
    return bool(
        getattr(message, "tool_calls", None)
        or getattr(message, "invalid_tool_calls", None)
        or (getattr(message, "additional_kwargs", None) or {}).get("tool_calls")
    )


def _strip_tool_calls_from_ai(message: AIMessage) -> AIMessage:
    """移除无法配对的 tool_calls 字段，避免 OpenAI 400。"""
    additional = dict(getattr(message, "additional_kwargs", None) or {})
    additional.pop("tool_calls", None)
    return message.model_copy(
        update={
            "tool_calls": [],
            "invalid_tool_calls": [],
            "additional_kwargs": additional,
        }
    )


def has_unanswered_tool_calls(messages: list) -> bool:
    """扫描全部 AIMessage：任一 tool_calls 未在紧邻后续 ToolMessage 中收齐则视为未完成。"""
    index = 0
    while index < len(messages):
        message = messages[index]
        if not isinstance(message, AIMessage) or not ai_message_has_tool_calls(message):
            index += 1
            continue

        expected = extract_tool_call_ids(message)
        if not expected:
            # 有 tool_calls 结构但无 id，无法安全续写或调用模型
            return True

        answered: set[str] = set()
        cursor = index + 1
        while cursor < len(messages) and isinstance(messages[cursor], ToolMessage):
            tool_call_id = getattr(messages[cursor], "tool_call_id", None)
            if tool_call_id:
                answered.add(str(tool_call_id))
            cursor += 1

        if not expected.issubset(answered):
            return True

        index = cursor
    return False


def sanitize_messages_for_model(messages: list) -> list:
    """修复发往 LLM 的消息序列，保证每个含 tool_calls 的 AIMessage 后紧跟完整 ToolMessage。"""
    sanitized: list = []
    index = 0
    while index < len(messages):
        message = messages[index]
        tool_calls = getattr(message, "tool_calls", None) or []
        invalid_tool_calls = getattr(message, "invalid_tool_calls", None) or []
        additional_tool_calls = (getattr(message, "additional_kwargs", None) or {}).get(
            "tool_calls"
        ) or []

        if isinstance(message, AIMessage) and (
            tool_calls or invalid_tool_calls or additional_tool_calls
        ):
            expected_ids = extract_tool_call_ids(message)
            following_tools: list[ToolMessage] = []
            cursor = index + 1
            while cursor < len(messages) and isinstance(messages[cursor], ToolMessage):
                following_tools.append(messages[cursor])
                cursor += 1

            returned_ids = {
                str(tool_message.tool_call_id)
                for tool_message in following_tools
                if getattr(tool_message, "tool_call_id", None)
            }

            if not expected_ids:
                sanitized.append(_strip_tool_calls_from_ai(message))
                sanitized.extend(following_tools)
            elif expected_ids.issubset(returned_ids):
                sanitized.append(message)
                sanitized.extend(following_tools)
            elif following_tools and returned_ids:
                missing_ids = expected_ids - returned_ids
                extra_tools = list(following_tools)
                for mid in missing_ids:
                    extra_tools.append(
                        ToolMessage(
                            content="[工具调用结果缺失，已跳过]",
                            tool_call_id=mid,
                        )
                    )
                sanitized.append(message)
                sanitized.extend(extra_tools)
            else:
                sanitized.append(message)
                for mid in expected_ids:
                    sanitized.append(
                        ToolMessage(
                            content="[工具调用结果缺失，已跳过]",
                            tool_call_id=mid,
                        )
                    )
            index = cursor
            continue

        if isinstance(message, ToolMessage):
            index += 1
            continue

        sanitized.append(message)
        index += 1

    return sanitized
