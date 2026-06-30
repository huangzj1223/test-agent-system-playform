"""Phase 1 澄清门控的共享检测逻辑。"""

from __future__ import annotations

import re

from langchain_core.messages import AIMessage, HumanMessage

CONTINUE_MARKER = "[继续输出]"
PHASE3_MARKER = "[Phase3续写]"
CLARIFICATION_MARKER = "[澄清已解决]"

SYSTEM_HUMAN_MARKERS = (CONTINUE_MARKER, PHASE3_MARKER, CLARIFICATION_MARKER)


def is_system_human_message(message: HumanMessage) -> bool:
    content = str(message.content or "")
    return any(marker in content for marker in SYSTEM_HUMAN_MARKERS)


def content_has_open_clarification(text: str) -> bool:
    """AI 回复是否仍在等待用户澄清 Phase 1 问题。"""
    if "需澄清" not in text and "澄清问题" not in text:
        return False

    if re.search(r"需澄清[^\n]*[：:]\s*无\b", text):
        return False
    if re.search(r"需澄清问题[^\n]*\n\s*无\b", text):
        return False

    wait_phrases = (
        "等待用户",
        "请确认",
        "请补充",
        "请回复",
        "等待您",
        "需您确认",
        "澄清后继续",
        "确认后继续",
        "请用户确认",
    )
    if any(phrase in text for phrase in wait_phrases):
        return True

    clar_section = text[text.find("需澄清") : text.find("需澄清") + 800] if "需澄清" in text else text
    if re.search(r"(\d+[\.、\)]\s|[-*]\s+)\S+", clar_section):
        return True
    return False


def awaiting_user_reply(messages: list) -> bool:
    """最后一条 AI 在等用户，且其后没有真实用户 HumanMessage。"""
    last_ai_idx = -1
    for idx, msg in enumerate(messages):
        if isinstance(msg, AIMessage):
            last_ai_idx = idx

    if last_ai_idx < 0:
        return False

    for msg in messages[last_ai_idx + 1 :]:
        if isinstance(msg, HumanMessage) and not is_system_human_message(msg):
            return False

    last_ai_text = str(messages[last_ai_idx].content or "")
    if content_has_open_clarification(last_ai_text):
        return True

    wait_phrases = ("等待用户", "请确认", "请回复", "需您确认", "请用户确认")
    return any(phrase in last_ai_text for phrase in wait_phrases)

# 兼容旧 import 路径
_awaiting_user_reply = awaiting_user_reply
_content_has_open_clarification = content_has_open_clarification
