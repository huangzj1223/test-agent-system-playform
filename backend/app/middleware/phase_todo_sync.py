"""根据工具调用与对话阶段自动同步 write_todos，避免 UI 进度条长期停在 Phase 1。"""

from __future__ import annotations

from typing import Any, Literal

from langchain.agents.middleware.types import AgentMiddleware, AgentState, ContextT
from langchain_core.messages import AIMessage, ToolMessage
from langgraph.runtime import Runtime
from langgraph.types import Command
from typing_extensions import override

from app.middleware.clarification_gate import awaiting_user_reply, content_has_open_clarification
from app.middleware.task_boundary import current_task_messages, is_new_task_turn

TodoStatus = Literal["pending", "in_progress", "completed"]

DEFAULT_PHASE_LABELS = [
    "Phase 1: 检索 + URL探索 + 需求解析",
    "Phase 2: 测试策略制定",
    "Phase 3: 测试用例设计 + 测试数据生成",
    "Phase 4: 质量评审",
    "Phase 5: 输出最终格式",
]

_PHASE_KEYWORDS = (
    ("Phase 1", "phase 1", "需求解析", "requirement-analysis", "增量上下文"),
    ("Phase 2", "phase 2", "测试策略", "test-strategy"),
    ("Phase 3", "phase 3", "用例设计", "test-case-design", "测试用例设计"),
    ("Phase 4", "phase 4", "质量评审", "quality-review"),
    ("Phase 5", "phase 5", "output-formatter", "最终格式", "输出最终"),
)

_TOOL_PHASE_HINTS: dict[str, int] = {
    "capture_page_snapshot": 1,
    "search_local_testcases": 1,
    "rag_query": 1,
    "export_testcases_to_excel": 3,
    "export_testcases_to_docx": 5,
    "export_testcases_to_json": 5,
}


def _phase_label_from_existing(todos: list[dict[str, Any]], index: int) -> str:
    if index < len(todos):
        content = str(todos[index].get("content", "") or "").strip()
        if content:
            return content
    return DEFAULT_PHASE_LABELS[index]


def _active_phase_from_todos(todos: list[dict[str, Any]] | None) -> int:
    if not todos:
        return 1
    for idx, item in enumerate(todos):
        if str(item.get("status", "")).lower() == "in_progress":
            return idx + 1
    if todos and all(str(item.get("status", "")).lower() == "completed" for item in todos):
        return 5
    return 1


def _infer_phase_from_messages(messages: list) -> int:
    """从当前任务片段内的工具调用与 Phase 关键词推断阶段（1~5）。"""
    segment = current_task_messages(messages)
    phase = 1
    for msg in segment:
        if isinstance(msg, ToolMessage):
            name = (getattr(msg, "name", "") or "").lower()
            content = str(getattr(msg, "content", "") or "")
            for tool_key, hint_phase in _TOOL_PHASE_HINTS.items():
                if tool_key in name or tool_key in content.lower():
                    phase = max(phase, hint_phase)
        if isinstance(msg, AIMessage):
            for tc in getattr(msg, "tool_calls", None) or []:
                tc_name = (tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", "")) or ""
                tc_name = str(tc_name).lower()
                for tool_key, hint_phase in _TOOL_PHASE_HINTS.items():
                    if tool_key in tc_name:
                        phase = max(phase, hint_phase)
            text = str(getattr(msg, "content", "") or "")
            lower = text.lower()
            for idx, keywords in enumerate(_PHASE_KEYWORDS, start=1):
                if any(kw.lower() in lower for kw in keywords):
                    phase = max(phase, idx)

    for msg in reversed(segment[-12:]):
        if hasattr(msg, "content") and "[Phase3续写]" in str(msg.content):
            return max(phase, 3)

    return phase


def build_phase_todos(active_phase: int, existing: list[dict[str, Any]] | None = None) -> list[dict[str, str]]:
    """生成 5 项 Phase 进度；active_phase 为当前进行中阶段（1~5）。"""
    active_phase = max(1, min(5, active_phase))
    todos: list[dict[str, str]] = []
    for i in range(5):
        if i + 1 < active_phase:
            status: TodoStatus = "completed"
        elif i + 1 == active_phase:
            status = "in_progress"
        else:
            status = "pending"
        todos.append(
            {
                "content": _phase_label_from_existing(existing or [], i),
                "status": status,
            }
        )
    return todos


def todos_need_sync(existing: list[dict[str, Any]] | None, inferred_phase: int) -> bool:
    if not existing or len(existing) < 5:
        return True
    current = _active_phase_from_todos(existing)
    return inferred_phase != current


def export_success_command(
    content: str,
    tool_call_id: str,
    *,
    existing_todos: list[dict[str, Any]] | None = None,
) -> Command:
    """Excel 导出成功时：返回 ToolMessage + 将进度同步到 Phase 3（与 write_todos 相同模式）。"""
    return Command(
        update={
            "todos": build_phase_todos(3, existing_todos),
            "messages": [
                ToolMessage(
                    content=content,
                    tool_call_id=tool_call_id,
                    name="export_testcases_to_excel",
                )
            ],
        }
    )


class PhaseTodoSyncMiddleware(AgentMiddleware[AgentState, ContextT]):
    """在模型回合结束后根据消息推断阶段并更新 state.todos（不包装工具返回值，避免 400）。"""

    @override
    def before_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict[str, Any] | None:
        messages = state.get("messages", [])
        existing = state.get("todos") or []
        if is_new_task_turn(messages, existing):
            from app.agents.testcase.export_session import clear_active_export_path

            clear_active_export_path()
            return {"todos": build_phase_todos(1, None)}
        return None

    @override
    async def abefore_model(
        self, state: AgentState, runtime: Runtime[ContextT]
    ) -> dict[str, Any] | None:
        return self.before_model(state, runtime)

    @override
    def after_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict[str, Any] | None:
        return self._maybe_sync_todos(state)

    @override
    async def aafter_model(self, state: AgentState, runtime: Runtime[ContextT]) -> dict[str, Any] | None:
        return self._maybe_sync_todos(state)

    def _maybe_sync_todos(self, state: AgentState) -> dict[str, Any] | None:
        messages = state.get("messages", [])
        if not messages:
            return None
        existing = state.get("todos") or []

        if awaiting_user_reply(messages):
            last_ai = next((m for m in reversed(messages) if isinstance(m, AIMessage)), None)
            if last_ai and content_has_open_clarification(str(last_ai.content or "")):
                if _active_phase_from_todos(existing) != 1:
                    return {"todos": build_phase_todos(1, existing)}
            return None

        inferred = _infer_phase_from_messages(messages)
        if not todos_need_sync(existing, inferred):
            return None
        return {"todos": build_phase_todos(inferred, existing)}
