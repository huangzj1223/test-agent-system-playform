import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

from app.services.agui_service import AgUiService


class FakeModelChatService:
    def __init__(self):
        self.calls = []

    async def stream_reply(self, *, messages, memory_context, provider_id, model_id):
        self.calls.append(
            {
                "messages": messages,
                "memory_context": memory_context,
                "provider_id": provider_id,
                "model_id": model_id,
            }
        )
        yield "真实"
        yield "回复"


async def collect_events(service, *, provider_id, model_id):
    return [
        json.loads(item.removeprefix("data: ").strip())
        async for item in service.run_events(
            user_id=uuid4(),
            conversation_id=uuid4(),
            messages=[{"role": "user", "content": "请分析当前测试"}],
            tools=[],
            provider_id=provider_id,
            model_id=model_id,
        )
    ]


def test_agui_normal_chat_streams_configured_model_and_persists_full_reply():
    saved = []
    provider_id = uuid4()
    model = FakeModelChatService()
    service = AgUiService(
        conversation_service=SimpleNamespace(
            ensure_conversation=lambda **kwargs: kwargs["conversation_id"],
            save_message=lambda **kwargs: saved.append(kwargs),
        ),
        model_chat_service=model,
    )

    events = asyncio.run(collect_events(service, provider_id=provider_id, model_id="test-model"))

    deltas = [event["delta"] for event in events if event["type"] == "TEXT_MESSAGE_CONTENT"]
    assert deltas == ["真实", "回复"]
    assert saved[-1]["content"] == "真实回复"
    assert model.calls == [
        {
            "messages": [{"role": "user", "content": "请分析当前测试"}],
            "memory_context": "",
            "provider_id": provider_id,
            "model_id": "test-model",
        }
    ]

