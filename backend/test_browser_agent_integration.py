import asyncio
import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.agents.tools.web import get_local_tools
from app.agents.tools.web.browser_tools import browser_probe
from app.agents.web_cli.agent import WebAgentContext, shell_path
from app.services.agent_execution_service import AgentExecutionError, AgentExecutionService
from app.services.agent_run_service import collect_agent_artifacts


def test_web_agent_context_accepts_conversation_target_url():
    context = WebAgentContext(
        project_identifier="demo",
        folder_id="web",
        target_url="https://example.test/login",
    )

    assert context.target_url == "https://example.test/login"


def test_web_agent_shell_prefers_repository_playwright_cli():
    first_path = Path(shell_path.split(os.pathsep)[0])

    assert first_path.name == ".bin"
    assert (first_path / "playwright-cli.CMD").exists()


def test_web_agent_registers_controlled_browser_probe():
    assert "inspect_web_page" in {tool.name for tool in get_local_tools()}


def test_browser_probe_rejects_non_http_url(tmp_path):
    calls = []

    result = browser_probe(
        "file:///etc/passwd",
        workspace_root=tmp_path,
        cli_path=tmp_path / "playwright-cli.CMD",
        command_runner=lambda *args, **kwargs: calls.append((args, kwargs)),
    )

    assert result["success"] is False
    assert result["error"] == "Only HTTP and HTTPS target URLs are allowed."
    assert calls == []


def test_browser_probe_generates_screenshot_evidence(tmp_path):
    cli_path = tmp_path / "playwright-cli.CMD"
    cli_path.write_text("test", encoding="utf-8")

    def fake_runner(command, **kwargs):
        if "screenshot" in command:
            filename = next(item.removeprefix("--filename=") for item in command if item.startswith("--filename="))
            Path(filename).write_bytes(b"png")
        if "snapshot" in command:
            filename = next(item.removeprefix("--filename=") for item in command if item.startswith("--filename="))
            Path(filename).write_text("login page with username password and login button", encoding="utf-8")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    result = browser_probe(
        "https://example.test/login",
        workspace_root=tmp_path,
        cli_path=cli_path,
        command_runner=fake_runner,
    )

    assert result["success"] is True
    assert result["target_url"] == "https://example.test/login"
    assert Path(result["screenshot_path"]).is_file()
    assert "username" in result["page_snapshot"]


def test_agent_execution_normalizes_browser_evidence_artifacts():
    raw = {
        "messages": [
            {
                "content": "done",
                "tool_result": {
                    "report_path": "runs/42/report.html",
                    "screenshot_path": "runs/42/login.png",
                    "trace_path": "runs/42/trace.zip",
                },
            }
        ]
    }

    async def invoke(agent_name, prompt, *, context):
        return {"agent": agent_name, "content": "browser test complete", "raw": raw}

    result = asyncio.run(
        AgentExecutionService(invoker=invoke).execute(
            "web_cli",
            "inspect login",
            context={},
        )
    )

    assert result.artifacts == [
        {"type": "report", "path": "runs/42/report.html"},
        {"type": "screenshot", "path": "runs/42/login.png"},
        {"type": "trace", "path": "runs/42/trace.zip"},
    ]
    assert collect_agent_artifacts(result.raw) == result.artifacts


def test_artifact_collection_deduplicates_and_ignores_unrelated_values():
    raw = {
        "artifacts": [{"type": "screenshot", "path": "shot.png"}],
        "nested": {"screenshot_path": "shot.png", "token": "must-not-be-collected"},
    }

    assert collect_agent_artifacts(raw) == [{"type": "screenshot", "path": "shot.png"}]


def test_artifact_collection_reads_structured_tool_message_content():
    raw = {
        "messages": [
            {
                "type": "tool",
                "content": json.dumps({"success": True, "screenshot_path": "runs/login.png"}),
            }
        ]
    }

    assert collect_agent_artifacts(raw) == [{"type": "screenshot", "path": "runs/login.png"}]


def test_web_agent_execution_requires_browser_evidence():
    async def invoke(agent_name, prompt, *, context):
        return {"agent": agent_name, "content": "I cannot access a browser.", "raw": {"messages": []}}

    with pytest.raises(AgentExecutionError, match="browser evidence"):
        asyncio.run(
            AgentExecutionService(invoker=invoke).execute(
                "web_cli",
                "inspect login",
                context={},
            )
        )


def test_web_agent_execution_forces_browser_probe_when_target_url_is_present():
    calls = []

    def inspect(target_url):
        calls.append(target_url)
        return {
            "success": True,
            "target_url": target_url,
            "page_snapshot": 'textbox "Username"\ntextbox "Password"\nbutton "Login"',
            "screenshot_path": "runs/real-login.png",
        }

    async def invoke(agent_name, prompt, *, context):
        assert "real-login.png" in prompt
        assert "do not claim that browser access is unavailable" in prompt
        return {"agent": agent_name, "content": "The required controls are present.", "raw": {}}

    result = asyncio.run(
        AgentExecutionService(invoker=invoke, browser_inspector=inspect).execute(
            "web_cli",
            "inspect login",
            context={"target_url": "https://example.test/login"},
        )
    )

    assert calls == ["https://example.test/login"]
    assert result.artifacts == [{"type": "screenshot", "path": "runs/real-login.png"}]
    assert "页面文本框：2" in result.content
    assert "页面按钮：1" in result.content
