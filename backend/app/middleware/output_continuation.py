"""检测模型输出被截断或 Phase 中途主动停止时，自动触发续写。"""

from __future__ import annotations

import json
from typing import Any

from langchain.agents.middleware.types import AgentMiddleware, AgentState, ContextT, hook_config
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.runtime import Runtime

from app.middleware.clarification_gate import (
    CLARIFICATION_MARKER,
    CONTINUE_MARKER,
    PHASE3_MARKER,
    awaiting_user_reply,
)
from app.middleware.tool_call_messages import (
    ai_message_has_tool_calls,
    has_unanswered_tool_calls,
)
from app.middleware.task_boundary import (
    CLARIFICATION_CONTINUE_PROMPT,
    clarification_just_resolved,
    current_task_messages,
    is_clarification_resolved_prompt,
)

_CONTINUE_PROMPT = (
    f"{CONTINUE_MARKER} 你上一轮回复因长度限制被截断。"
    "请从截断处无缝续写，不要重复已输出内容。"
    "若处于 Phase 3，继续未完成用例；全部 Phase 完成后更新 write_todos。"
)

_PHASE3_CONTINUE_PROMPT = (
    f"{PHASE3_MARKER} Phase 3 仍在进行中，尚未完成全部用例导出。"
    "请立即继续生成下一批用例（不要重复已生成的用例），"
    "生成完整用例后调用 export_testcases_to_excel 导出，"
    "直到所有模块的 P0/P1/P2 用例全部导出完毕后再调用 write_todos 将 Phase 3 标为 completed。"
    "本条仅适用于 Phase 3 已获用户确认后的批次续写，请直接继续本 Phase 未完成的导出，勿因单批结束而整体停下。"
)


def _get_finish_reason(message: AIMessage) -> str:
    metadata = getattr(message, "response_metadata", None) or {}
    finish = (
        metadata.get("finish_reason")
        or metadata.get("stop_reason")
        or metadata.get("stopReason")
        or ""
    )
    if finish:
        return str(finish).lower()
    additional = getattr(message, "additional_kwargs", None) or {}
    extra = additional.get("finish_reason") or additional.get("stop_reason") or ""
    return str(extra).lower()


def _phase_prerequisites_met_for_phase3(todos: list[dict[str, Any]] | None) -> bool:
    """Phase 3 续写仅允许在 Phase 1/2 已完成时触发。"""
    if not todos or len(todos) < 3:
        return False
    for todo in todos[:2]:
        if str(todo.get("status", "")).lower() != "completed":
            return False
    return str(todos[2].get("status", "")).lower() == "in_progress"


def _is_output_truncated(message: AIMessage) -> bool:
    """判断 AIMessage 是否因输出 token 上限被截断。"""
    if ai_message_has_tool_calls(message):
        return False
    return _get_finish_reason(message) in {"length", "max_tokens"}


def _is_phase3_incomplete(messages: list, todos: list[dict[str, Any]] | None = None) -> bool:
    """检测 Phase 3 是否处于 in_progress 但还没导出完毕（仅看当前任务片段）。"""
    segment = current_task_messages(messages)

    if awaiting_user_reply(segment):
        return False

    if not _phase_prerequisites_met_for_phase3(todos):
        return False

    last_ai = next((m for m in reversed(segment) if isinstance(m, AIMessage)), None)
    if not last_ai:
        return False
    if ai_message_has_tool_calls(last_ai):
        return False
    if _get_finish_reason(last_ai) in {"length", "max_tokens"}:
        return False

    phase3_in_progress_idx = -1
    phase3_completed_idx = -1

    for idx, msg in enumerate(segment):
        if not isinstance(msg, ToolMessage):
            continue
        tool_name = getattr(msg, "name", "") or ""
        if "write_todos" not in tool_name and "todos" not in tool_name.lower():
            continue
        content = str(getattr(msg, "content", "") or "")
        has_phase3 = any(kw in content for kw in ["Phase 3", "Phase3", "测试用例设计", "phase_3"])
        if not has_phase3:
            try:
                data = json.loads(content)
                todos_payload = data if isinstance(data, list) else data.get("todos", [])
                for todo in todos_payload:
                    label = str(todo.get("content", "") or todo.get("name", "")).lower()
                    status = str(todo.get("status", "")).lower()
                    if "phase 3" in label or "phase3" in label or "用例设计" in label:
                        if status == "in_progress":
                            phase3_in_progress_idx = idx
                        elif status == "completed":
                            phase3_completed_idx = idx
            except Exception:
                pass
            continue
        if "in_progress" in content:
            phase3_in_progress_idx = idx
        if "completed" in content:
            phase3_completed_idx = idx

    if phase3_in_progress_idx == -1:
        return True

    if phase3_completed_idx > phase3_in_progress_idx:
        return False

    return True


class OutputContinuationMiddleware(AgentMiddleware[AgentState, ContextT]):
    """自动续写中间件：处理 token 截断、澄清续写和 Phase 3 中途停止。"""

    def __init__(self, max_continuations: int = 8) -> None:
        super().__init__()
        self.max_continuations = max_continuations

    def _continuation_count(self, messages: list) -> int:
        count = 0
        for message in messages:
            if isinstance(message, HumanMessage):
                content = str(message.content)
                if (
                    CONTINUE_MARKER in content
                    or PHASE3_MARKER in content
                    or CLARIFICATION_MARKER in content
                ):
                    count += 1
        return count

    def before_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict | None:
        """用户回复澄清问题后，在模型回合开始前注入续写指令。

        不使用 jump_to：作为链中首个 before_model 时，jump_to=model 会解析为
        本节点名，而 LangChain 在 name==model_destination 时不注册该路由目标，触发 KeyError。
        仅注入 messages/todos，沿默认边进入后续 before_model → model 即可。
        """
        messages = state.get("messages", [])
        if not messages or self._continuation_count(messages) >= self.max_continuations:
            return None

        if not clarification_just_resolved(messages):
            return None

        if isinstance(messages[-1], HumanMessage) and is_clarification_resolved_prompt(messages[-1]):
            return None

        todos = state.get("todos") or []
        from app.middleware.phase_todo_sync import build_phase_todos

        return {
            "messages": [HumanMessage(content=CLARIFICATION_CONTINUE_PROMPT)],
            "todos": build_phase_todos(2, todos),
        }

    async def abefore_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict | None:
        return self.before_model(state, runtime)

    def _should_continue(
        self, messages: list, todos: list[dict[str, Any]] | None = None
    ) -> tuple[bool, str]:
        """返回 (是否需要续写, 续写提示词)。"""
        if has_unanswered_tool_calls(messages):
            return False, ""

        if awaiting_user_reply(messages):
            return False, ""

        last_ai = next((m for m in reversed(messages) if isinstance(m, AIMessage)), None)
        if not last_ai:
            return False, ""

        if _is_output_truncated(last_ai):
            return True, _CONTINUE_PROMPT

        if _is_phase3_incomplete(messages, todos):
            return True, _PHASE3_CONTINUE_PROMPT

        return False, ""

    @hook_config(can_jump_to=["model"])
    def after_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict | None:
        messages = state.get("messages", [])
        if not messages or self._continuation_count(messages) >= self.max_continuations:
            return None

        todos = state.get("todos") or []
        should, prompt = self._should_continue(messages, todos)
        if not should:
            return None

        update: dict = {
            "jump_to": "model",
            "messages": [HumanMessage(content=prompt)],
        }
        if PHASE3_MARKER in prompt:
            from app.middleware.phase_todo_sync import build_phase_todos

            update["todos"] = build_phase_todos(3, todos)
        return update

    @hook_config(can_jump_to=["model"])
    async def aafter_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict | None:
        return self.after_model(state, runtime)


# 兼容旧测试 import
_awaiting_user_reply = awaiting_user_reply
