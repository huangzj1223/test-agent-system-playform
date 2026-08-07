import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.agent_execution_service import (
    AgentExecutionError,
    AgentExecutionService,
    resolve_bridge_agent,
    sanitize_agent_prompt,
)
from app.services.agui_service import AgUiService
from app.agents.api.agent import skills_root as api_skills_root, workspace_root as api_workspace_root


def test_resolve_bridge_agent_uses_registered_skill_config():
    skill = SimpleNamespace(config={"bridge_agent": "web_cli"}, entrypoint="agents.web")

    assert resolve_bridge_agent(skill) == "web_cli"


def test_api_agent_resolves_skills_and_workspace_from_repository_root():
    repository_root = Path(__file__).resolve().parent.parent

    assert api_skills_root == repository_root / ".agents" / "skills"
    assert api_skills_root.is_dir()
    assert api_workspace_root == repository_root / "backend" / "workspace" / "api"


def test_resolve_bridge_agent_rejects_unknown_entrypoint():
    skill = SimpleNamespace(config={}, entrypoint="agents.unknown")

    with pytest.raises(AgentExecutionError, match="不支持的智能体入口"):
        resolve_bridge_agent(skill)


def test_agent_execution_forwards_only_allowlisted_context():
    calls = []

    async def invoke(agent_name, prompt, *, context):
        calls.append((agent_name, prompt, context))
        return {"agent": agent_name, "content": "执行完成", "raw": {"artifacts": ["report.html"]}}

    service = AgentExecutionService(invoker=invoke)
    result = asyncio.run(
        service.execute(
            "api",
            "生成接口测试",
            context={
                "project_identifier": "demo",
                "target_url": "https://example.test",
                "secret": "must-not-forward",
            },
            timeout_seconds=1,
        )
    )

    assert result.content == "执行完成"
    assert calls == [
        (
            "api",
            "生成接口测试",
            {"project_identifier": "demo", "target_url": "https://example.test"},
        )
    ]


def test_agent_execution_removes_tracking_reference_from_agent_prompt():
    calls = []

    async def invoke(agent_name, prompt, *, context):
        calls.append(prompt)
        return {"agent": agent_name, "content": "17 endpoints", "raw": {}}

    result = asyncio.run(
        AgentExecutionService(invoker=invoke).execute(
            "api",
            "列出接口总数。业务验收编号 BR-API-READ-20260715。",
            context={"project_identifier": "PR-1"},
        )
    )

    assert result.content == "17 endpoints"
    assert calls == ["列出接口总数。"]


def test_agent_prompt_keeps_real_task_identifiers():
    prompt = "查询任务编号 RUN-20260715 的执行状态。"

    assert sanitize_agent_prompt(prompt) == prompt


def test_agent_execution_times_out_deterministically():
    async def invoke(agent_name, prompt, *, context):
        await asyncio.sleep(0.05)
        return {"agent": agent_name, "content": "late"}

    service = AgentExecutionService(invoker=invoke)

    with pytest.raises(AgentExecutionError, match="执行超时"):
        asyncio.run(service.execute("api", "slow", timeout_seconds=0.001))


def test_agui_executes_matched_skill_instead_of_returning_route_placeholder():
    saved = []
    skill = SimpleNamespace(
        id=uuid4(),
        label="接口测试技能",
        entrypoint="agents.api",
        config={"bridge_agent": "api"},
    )

    class FakeExecutionService:
        async def execute(self, agent_name, prompt, *, context=None, timeout_seconds=600):
            assert agent_name == "api"
            assert prompt == "生成 API 测试"
            assert context == {"project_identifier": "demo"}
            return SimpleNamespace(agent_name="api", content="智能体真实结果", raw={})

    service = AgUiService(
        conversation_service=SimpleNamespace(
            ensure_conversation=lambda **kwargs: kwargs["conversation_id"],
            save_message=lambda **kwargs: saved.append(kwargs),
        ),
        skill_service=SimpleNamespace(route_intent=lambda user_id, prompt: skill),
        agent_execution_service=FakeExecutionService(),
    )

    async def collect():
        return [
            json.loads(item.removeprefix("data: ").strip())
            async for item in service.run_events(
                user_id=uuid4(),
                conversation_id=uuid4(),
                messages=[{"role": "user", "content": "生成 API 测试"}],
                tools=[],
                forwarded_props={"project_identifier": "demo", "secret": "drop"},
            )
        ]

    events = asyncio.run(collect())

    assert "AGENT_RUN_STARTED" in [event["type"] for event in events]
    assert "AGENT_RUN_FINISHED" in [event["type"] for event in events]
    assert saved[-1]["content"] == "智能体真实结果"


def test_agui_emits_progress_while_long_agent_is_running():
    skill = SimpleNamespace(
        id=uuid4(),
        label="接口测试技能",
        entrypoint="agents.api",
        config={"bridge_agent": "api"},
    )

    class SlowExecutionService:
        async def execute(self, agent_name, prompt, *, context=None, timeout_seconds=600):
            await asyncio.sleep(0.03)
            return SimpleNamespace(agent_name=agent_name, content="done", raw={})

    service = AgUiService(
        conversation_service=SimpleNamespace(
            ensure_conversation=lambda **kwargs: kwargs["conversation_id"],
            save_message=lambda **kwargs: None,
        ),
        skill_service=SimpleNamespace(route_intent=lambda user_id, prompt: skill),
        agent_execution_service=SlowExecutionService(),
        agent_progress_interval=0.005,
    )

    async def collect():
        return [
            json.loads(item.removeprefix("data: ").strip())
            async for item in service.run_events(
                user_id=uuid4(),
                conversation_id=uuid4(),
                messages=[{"role": "user", "content": "summarize API"}],
                tools=[],
            )
        ]

    event_types = [event["type"] for event in asyncio.run(collect())]

    assert "AGENT_RUN_PROGRESS" in event_types
    assert event_types.index("AGENT_RUN_STARTED") < event_types.index("AGENT_RUN_PROGRESS")
    assert event_types.index("AGENT_RUN_PROGRESS") < event_types.index("AGENT_RUN_FINISHED")
