import sys
import asyncio
import io
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def test_known_agents_include_testing_domains():
    from app.agents.bridge import list_agents

    agents = list_agents()

    assert "api" in agents
    assert "testcase" in agents
    assert "security" in agents
    assert agents["api"].module == "app.agents.api.agent"


def test_build_agent_input_uses_langchain_message_shape():
    from app.agents.bridge import build_agent_input

    payload = build_agent_input("生成 datafoundry 项目的 API 自动化脚本")

    assert payload == {
        "messages": [
            {
                "role": "user",
                "content": "生成 datafoundry 项目的 API 自动化脚本",
            }
        ]
    }


def test_parse_context_accepts_json_and_key_value_pairs():
    from app.agents.bridge import parse_context

    assert parse_context('{"project_identifier":"datafoundry"}') == {
        "project_identifier": "datafoundry"
    }
    assert parse_context("project_identifier=datafoundry,folder_id=api") == {
        "project_identifier": "datafoundry",
        "folder_id": "api",
    }
    assert parse_context(None) == {}


def test_extract_final_text_supports_dict_and_message_objects():
    from app.agents.bridge import extract_final_text

    class Message:
        content = "done"

    assert extract_final_text({"messages": [{"content": "first"}, Message()]}) == "done"
    assert extract_final_text({"output": "plain"}) == "plain"
    assert extract_final_text("already text") == "already text"


def test_invoke_agent_preserves_empty_runtime_context(monkeypatch):
    from app.agents import bridge

    observed = {}

    class FakeAgent:
        async def ainvoke(self, payload, *, config, context):
            observed["context"] = context
            return {"output": "done"}

    monkeypatch.setattr(
        bridge.importlib,
        "import_module",
        lambda module: SimpleNamespace(agent=FakeAgent()),
    )

    result = asyncio.run(bridge.invoke_agent("api", "review only"))

    assert result["content"] == "done"
    assert observed["context"] == {}


def test_parse_context_rejects_invalid_shapes():
    from app.agents.bridge import parse_context

    with pytest.raises(ValueError):
        parse_context("[1, 2, 3]")

    with pytest.raises(ValueError):
        parse_context("missing_equals")


def test_cli_returns_timeout_code_for_stalled_agent(monkeypatch, capsys):
    from app.agents import cli

    async def stalled(*args, **kwargs):
        await asyncio.sleep(1)

    monkeypatch.setattr(cli, "invoke_agent", stalled)
    result = asyncio.run(
        cli.async_main(
            [
                "--agent",
                "api",
                "--prompt",
                "review only",
                "--timeout-seconds",
                "0.01",
            ]
        )
    )

    assert result == 124
    assert '"error": "timeout"' in capsys.readouterr().err


def test_cli_json_output_falls_back_on_non_utf8_console():
    from app.agents.cli import _print_json

    buffer = io.BytesIO()
    stream = io.TextIOWrapper(buffer, encoding="ascii")

    _print_json({"content": "执行成功"}, file=stream)
    stream.flush()

    assert b"\\u6267\\u884c\\u6210\\u529f" in buffer.getvalue()
