"""Safe adapter from AG-UI skill routing to the existing testing-agent bridge."""

import asyncio
import json
import re
from dataclasses import dataclass
from collections.abc import Mapping
from typing import Any, Awaitable, Callable

from app.agents.bridge import invoke_agent
from app.agents.tools.web.browser_tools import browser_probe


SUPPORTED_BRIDGE_AGENTS = {"api", "testcase", "security", "web_cli", "web_mcp", "explorer"}
ENTRYPOINT_AGENT_MAP = {
    "agents.api": "api",
    "agents.testcase": "testcase",
    "agents.security": "security",
    "agents.web": "web_cli",
    "agents.web_cli": "web_cli",
    "agents.web_mcp": "web_mcp",
    "agents.explorer": "explorer",
    "agents.failure_analysis": "api",
}
ALLOWED_CONTEXT_KEYS = {
    "project_identifier",
    "project_id",
    "target_url",
    "test_run_id",
    "folder_id",
}
TRACKING_REFERENCE_PATTERN = re.compile(
    r"(?:业务)?验收编号\s*[:：]?\s*[A-Za-z0-9][A-Za-z0-9_.-]*[。.]?",
    re.IGNORECASE,
)


class AgentExecutionError(RuntimeError):
    """User-safe execution failure."""


@dataclass(frozen=True)
class AgentExecutionResult:
    agent_name: str
    content: str
    raw: Any
    artifacts: list[dict[str, str]]


ARTIFACT_PATH_TYPES = {
    "report_path": "report",
    "screenshots_path": "screenshots",
    "screenshot_path": "screenshot",
    "trace_path": "trace",
    "video_path": "video",
    "local_path": "file",
    "object_name": "file",
}


def collect_agent_artifacts(raw: Any) -> list[dict[str, str]]:
    """Collect known browser/test evidence paths without retaining arbitrary data."""
    collected: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    def add(item_type: str, path: str) -> None:
        clean_path = path.strip()[:4096]
        key = (item_type, clean_path)
        if clean_path and key not in seen:
            seen.add(key)
            collected.append({"type": item_type[:40], "path": clean_path})

    def visit(value: Any, depth: int = 0) -> None:
        if depth > 10:
            return
        if isinstance(value, Mapping):
            explicit_path = value.get("path")
            explicit_type = value.get("type")
            if isinstance(explicit_path, str):
                add(str(explicit_type or "file"), explicit_path)
            for key, item in value.items():
                item_type = ARTIFACT_PATH_TYPES.get(str(key))
                if item_type and isinstance(item, str):
                    add(item_type, item)
                elif key != "path":
                    visit(item, depth + 1)
        elif isinstance(value, (list, tuple)):
            for item in value:
                visit(item, depth + 1)
        elif isinstance(value, str) and len(value) <= 100_000:
            candidate = value.strip()
            if candidate.startswith(("{", "[")):
                try:
                    visit(json.loads(candidate), depth + 1)
                except json.JSONDecodeError:
                    pass

    visit(raw)
    return collected


def resolve_bridge_agent(skill) -> str:
    configured = (getattr(skill, "config", None) or {}).get("bridge_agent")
    agent_name = configured or ENTRYPOINT_AGENT_MAP.get(getattr(skill, "entrypoint", ""))
    if agent_name not in SUPPORTED_BRIDGE_AGENTS:
        raise AgentExecutionError("不支持的智能体入口")
    return agent_name


def sanitize_agent_context(context: dict | None) -> dict[str, str]:
    safe: dict[str, str] = {}
    for key, value in (context or {}).items():
        if key not in ALLOWED_CONTEXT_KEYS or value is None:
            continue
        text = str(value).strip()
        if text:
            safe[key] = text[:2000]
    return safe


def sanitize_agent_prompt(prompt: str) -> str:
    """Keep audit markers out of resource identifiers passed to an agent."""
    sanitized = TRACKING_REFERENCE_PATTERN.sub("", prompt).strip()
    return sanitized or prompt


class AgentExecutionService:
    """Invoke only registered test agents with bounded context and timeout."""

    def __init__(
        self,
        invoker: Callable[..., Awaitable[dict[str, Any]]] = invoke_agent,
        browser_inspector: Callable[[str], dict[str, object]] = browser_probe,
    ):
        self.invoker = invoker
        self.browser_inspector = browser_inspector

    async def execute(
        self,
        agent_name: str,
        prompt: str,
        *,
        context: dict | None = None,
        timeout_seconds: float = 600,
    ) -> AgentExecutionResult:
        if agent_name not in SUPPORTED_BRIDGE_AGENTS:
            raise AgentExecutionError("不支持的智能体入口")
        safe_context = sanitize_agent_context(context)
        browser_evidence: dict[str, object] | None = None
        execution_prompt = sanitize_agent_prompt(prompt)
        if agent_name in {"web_cli", "web_mcp"} and safe_context.get("target_url"):
            browser_evidence = await asyncio.to_thread(
                self.browser_inspector,
                safe_context["target_url"],
            )
            if not browser_evidence.get("success"):
                raise AgentExecutionError("Browser inspection failed.")
            execution_prompt = (
                f"{execution_prompt}\n\n"
                "The platform has already performed an approved browser inspection. "
                "Use the following real page snapshot and evidence path in your answer; "
                "do not claim that browser access is unavailable.\n"
                f"{json.dumps(browser_evidence, ensure_ascii=False)}"
            )

        try:
            result = await asyncio.wait_for(
                self.invoker(
                    agent_name,
                    execution_prompt,
                    context=safe_context,
                ),
                timeout=timeout_seconds,
            )
        except TimeoutError as exc:
            raise AgentExecutionError("智能体执行超时") from exc
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError("智能体执行失败") from exc

        raw = result.get("raw")
        if browser_evidence is not None:
            raw = {"browser_probe": browser_evidence, "agent_result": raw}
        artifacts = collect_agent_artifacts(raw)
        if agent_name in {"web_cli", "web_mcp"} and not artifacts:
            raise AgentExecutionError("Web agent finished without browser evidence.")

        content = str(result.get("content") or "")
        if browser_evidence is not None:
            snapshot = str(browser_evidence.get("page_snapshot") or "")
            content = (
                "浏览器检查已完成。\n"
                f"- 目标地址：{browser_evidence.get('target_url')}\n"
                f"- 页面文本框：{snapshot.count('textbox ')}\n"
                f"- 页面按钮：{snapshot.count('button ')}\n"
                f"- 截图证据：{browser_evidence.get('screenshot_path')}\n\n"
                f"智能体分析：\n{content}"
            )

        return AgentExecutionResult(
            agent_name=agent_name,
            content=content,
            raw=raw,
            artifacts=artifacts,
        )
