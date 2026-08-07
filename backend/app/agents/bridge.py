"""Cross-project invocation bridge for testing agents.

The bridge keeps agent loading, message construction, context passing, and
result extraction in one place so CLI, MCP, and Codex skills share one contract.
"""

from __future__ import annotations

import importlib
import inspect
import json
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator, Mapping


@dataclass(frozen=True)
class AgentSpec:
    name: str
    module: str
    description: str


AGENTS: dict[str, AgentSpec] = {
    "api": AgentSpec(
        name="api",
        module="app.agents.api.agent",
        description="API 自动化测试计划、用例、脚本生成与执行",
    ),
    "testcase": AgentSpec(
        name="testcase",
        module="app.agents.testcase.agent",
        description="需求分析与测试用例生成",
    ),
    "security": AgentSpec(
        name="security",
        module="app.agents.security.agent",
        description="渗透测试、漏洞验证与安全报告",
    ),
    "web_cli": AgentSpec(
        name="web_cli",
        module="app.agents.web_cli.agent",
        description="基于 Playwright CLI 的 Web 测试生成与执行",
    ),
    "web_mcp": AgentSpec(
        name="web_mcp",
        module="app.agents.web_mcp.agent",
        description="基于 Playwright MCP 的 Web 测试生成与执行",
    ),
    "explorer": AgentSpec(
        name="explorer",
        module="app.agents.explorer.agent",
        description="Web 页面探测与功能识别",
    ),
}


def list_agents() -> dict[str, AgentSpec]:
    """Return supported agent specs keyed by stable agent name."""
    return dict(AGENTS)


def parse_context(value: str | None) -> dict[str, Any]:
    """Parse JSON or comma-separated key=value context values."""
    if not value:
        return {}

    text = value.strip()
    if not text:
        return {}

    if text.startswith("{"):
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            raise ValueError("context JSON must be an object")
        return parsed

    result: dict[str, Any] = {}
    for item in text.split(","):
        if "=" not in item:
            raise ValueError("context must be JSON or comma-separated key=value pairs")
        key, raw = item.split("=", 1)
        key = key.strip()
        if not key:
            raise ValueError("context keys cannot be empty")
        result[key] = raw.strip()
    return result


def build_agent_input(prompt: str) -> dict[str, list[dict[str, str]]]:
    """Build the LangGraph/deepagents message payload."""
    return {"messages": [{"role": "user", "content": prompt}]}


def extract_final_text(result: Any) -> str:
    """Extract a human-readable final answer from common LangGraph results."""
    if isinstance(result, str):
        return result

    if isinstance(result, Mapping):
        messages = result.get("messages")
        if isinstance(messages, list) and messages:
            last_message = messages[-1]
            content = _message_content(last_message)
            if content is not None:
                return content

        for key in ("output", "content", "text"):
            value = result.get(key)
            if isinstance(value, str):
                return value

    content = _message_content(result)
    if content is not None:
        return content

    return json.dumps(to_jsonable(result), ensure_ascii=False)


async def invoke_agent(
    agent_name: str,
    prompt: str,
    *,
    context: Mapping[str, Any] | None = None,
    config: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Invoke an agent by stable name and return normalized output."""
    if agent_name not in AGENTS:
        supported = ", ".join(sorted(AGENTS))
        raise ValueError(f"unknown agent '{agent_name}', supported agents: {supported}")

    payload = build_agent_input(prompt)
    runtime_context = dict(context or {})
    runtime_config = dict(config or {})

    async with _load_runnable(agent_name) as runnable:
        result = await runnable.ainvoke(
            payload,
            config=runtime_config or None,
            context=runtime_context,
        )

    return {
        "agent": agent_name,
        "content": extract_final_text(result),
        "raw": to_jsonable(result),
    }


def to_jsonable(value: Any) -> Any:
    """Convert common message/result objects to JSON-compatible values."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Mapping):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(item) for item in value]
    if hasattr(value, "model_dump"):
        return to_jsonable(value.model_dump())
    if hasattr(value, "dict"):
        return to_jsonable(value.dict())
    content = _message_content(value)
    if content is not None:
        return {
            "type": value.__class__.__name__,
            "content": content,
        }
    return repr(value)


def _message_content(message: Any) -> str | None:
    if isinstance(message, Mapping):
        content = message.get("content")
    else:
        content = getattr(message, "content", None)

    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(_content_block_text(block) for block in content)
    return None


def _content_block_text(block: Any) -> str:
    if isinstance(block, str):
        return block
    if isinstance(block, Mapping):
        text = block.get("text")
        return text if isinstance(text, str) else ""
    return ""


@asynccontextmanager
async def _load_runnable(agent_name: str) -> AsyncIterator[Any]:
    spec = AGENTS[agent_name]
    module = importlib.import_module(spec.module)
    exported = getattr(module, "agent", None)

    if hasattr(exported, "ainvoke"):
        yield exported
        return

    factory = exported if callable(exported) else getattr(module, "make_agent", None)
    if factory is None:
        raise RuntimeError(f"agent module '{spec.module}' does not expose agent or make_agent")

    manager = factory()
    if hasattr(manager, "__aenter__") and hasattr(manager, "__aexit__"):
        async with manager as runnable:
            yield runnable
        return

    if inspect.isawaitable(manager):
        runnable = await manager
        yield runnable
        return

    if hasattr(manager, "ainvoke"):
        yield manager
        return

    raise RuntimeError(f"agent '{agent_name}' did not resolve to an async runnable")
