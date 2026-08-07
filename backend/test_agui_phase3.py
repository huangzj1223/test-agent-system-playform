import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

from app.services.agui_service import AguiService


async def _collect_events(service, *, conversation_id, messages, tools):
    return [
        json.loads(item.removeprefix("data: ").strip())
        async for item in service.run_events(
            user_id=uuid4(),
            conversation_id=conversation_id,
            messages=messages,
            tools=tools,
        )
        if item.startswith("data: ")
    ]


def test_agui_stream_persists_messages_and_emits_text_events():
    saved = []
    service = AguiService(
        conversation_service=SimpleNamespace(
            ensure_conversation=lambda **kwargs: kwargs["conversation_id"],
            save_message=lambda **kwargs: saved.append(kwargs),
        )
    )

    events = asyncio.run(
        _collect_events(
            service,
            conversation_id=uuid4(),
            messages=[{"role": "user", "content": "hello"}],
            tools=[],
        )
    )

    assert [event["type"] for event in events] == [
        "RUN_STARTED",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "RUN_FINISHED",
    ]
    assert saved[0]["role"] == "user"
    assert saved[1]["role"] == "assistant"


def test_agui_stream_runs_echo_tool_and_emits_tool_events():
    saved = []
    service = AguiService(
        conversation_service=SimpleNamespace(
            ensure_conversation=lambda **kwargs: kwargs["conversation_id"],
            save_message=lambda **kwargs: saved.append(kwargs),
        )
    )

    events = asyncio.run(
        _collect_events(
            service,
            conversation_id=uuid4(),
            messages=[{"role": "user", "content": "/tool echo hello"}],
            tools=[{"name": "echo"}],
        )
    )

    event_types = [event["type"] for event in events]
    assert "TOOL_CALL_START" in event_types
    assert "TOOL_CALL_END" in event_types
    assert "TOOL_RESULT" in event_types
    assert saved[-1]["role"] == "assistant"
    assert "hello" in saved[-1]["content"]
