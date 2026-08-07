import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.agent_run_service import (
    AgentRunStateError,
    classify_agent_risk,
    ensure_agent_run_transition,
)
from app.services.agui_service import AgUiService
from app.api.v2.agent_runs import approve_agent_run
from app.schemas.agent_run import AgentRunDecision


def test_agent_risk_classification_separates_read_browser_and_blocked_actions():
    assert classify_agent_risk("api", "summarize the API contract") == "L1"
    assert classify_agent_risk("web_cli", "open the test site and inspect login") == "L2"
    assert classify_agent_risk("api", "delete all production data") == "L4"


def test_agent_run_state_machine_rejects_skipping_approval():
    ensure_agent_run_transition("pending_approval", "running")
    ensure_agent_run_transition("running", "succeeded")

    with pytest.raises(AgentRunStateError):
        ensure_agent_run_transition("pending_approval", "succeeded")


def test_agui_browser_skill_requires_approval_before_execution():
    saved = []
    prepared = []
    skill = SimpleNamespace(
        id=uuid4(),
        label="Web browser testing",
        entrypoint="agents.web",
        config={"bridge_agent": "web_cli"},
    )

    class FakeExecutionService:
        calls = 0

        async def execute(self, *args, **kwargs):
            self.calls += 1
            raise AssertionError("browser agent must not run before approval")

    class FakeAgentRunService:
        async def prepare_run(self, **kwargs):
            prepared.append(kwargs)
            return SimpleNamespace(
                id=uuid4(),
                status="pending_approval",
                risk_level="L2",
                agent_name=kwargs["agent_name"],
            )

    executor = FakeExecutionService()
    service = AgUiService(
        conversation_service=SimpleNamespace(
            ensure_conversation=lambda **kwargs: kwargs["conversation_id"],
            save_message=lambda **kwargs: saved.append(kwargs),
        ),
        skill_service=SimpleNamespace(route_intent=lambda user_id, prompt: skill),
        agent_execution_service=executor,
        agent_run_service=FakeAgentRunService(),
    )

    async def collect():
        return [
            json.loads(item.removeprefix("data: ").strip())
            async for item in service.run_events(
                user_id=uuid4(),
                conversation_id=uuid4(),
                messages=[{"role": "user", "content": "inspect the login page"}],
                tools=[],
                forwarded_props={"target_url": "https://example.test"},
            )
        ]

    events = asyncio.run(collect())
    approval = next(event for event in events if event["type"] == "ACTION_REQUIRES_APPROVAL")

    assert approval["riskLevel"] == "L2"
    assert approval["agentName"] == "web_cli"
    assert executor.calls == 0
    assert prepared[0]["context"] == {"target_url": "https://example.test"}
    assert saved[-1]["content"] == "This action is waiting for your approval."


def test_approved_agent_returns_running_and_schedules_background_execution():
    user_id = uuid4()
    conversation_id = uuid4()
    run_id = uuid4()
    scheduled = []

    class FakeRunService:
        async def approve(self, owner_id, requested_run_id, note):
            assert owner_id == user_id
            assert requested_run_id == run_id
            return SimpleNamespace(
                id=run_id,
                user_id=user_id,
                conversation_id=conversation_id,
                agent_name="web_cli",
                prompt="inspect login",
                context={"target_url": "https://example.test"},
                status="running",
            )

    class FakeBackgroundTasks:
        def add_task(self, func, *args, **kwargs):
            scheduled.append((func, args, kwargs))

    response = asyncio.run(
        approve_agent_run(
            run_id=run_id,
            body=AgentRunDecision(),
            current_user=SimpleNamespace(id=user_id),
            service=FakeRunService(),
            background_tasks=FakeBackgroundTasks(),
        )
    )

    assert response.data.status == "running"
    assert len(scheduled) == 1
    assert scheduled[0][1] == (run_id, user_id)
