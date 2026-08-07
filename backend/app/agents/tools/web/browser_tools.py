"""Controlled browser inspection tool for approved Web agent runs."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Callable, Sequence
from urllib.parse import urlparse
from uuid import uuid4

from langchain_core.tools import tool

from app.config.settings import settings


PROJECT_ROOT = Path(__file__).resolve().parents[5]


def _project_path(value: str) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (PROJECT_ROOT / path).resolve()


def browser_probe(
    target_url: str,
    *,
    workspace_root: Path | None = None,
    cli_path: Path | None = None,
    command_runner: Callable[..., object] = subprocess.run,
) -> dict[str, object]:
    """Open a URL, capture an accessibility snapshot, and save screenshot evidence."""
    parsed = urlparse(target_url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return {"success": False, "error": "Only HTTP and HTTPS target URLs are allowed."}

    workspace = workspace_root or _project_path(settings.web_cli_workspace_root)
    executable = cli_path or PROJECT_ROOT / "ui" / "node_modules" / ".bin" / "playwright-cli.CMD"
    if not executable.is_file():
        return {"success": False, "error": "Repository Playwright CLI is not available."}

    run_id = uuid4().hex
    session_name = f"agent-web-{run_id[:12]}"
    evidence_dir = workspace / "evidence" / run_id
    evidence_dir.mkdir(parents=True, exist_ok=True)
    screenshot_path = (evidence_dir / "page.png").resolve()
    snapshot_path = (evidence_dir / "page.yml").resolve()

    def execute(arguments: Sequence[str], timeout: int = 90):
        completed = command_runner(
            [str(executable), f"-s={session_name}", *arguments],
            cwd=str(workspace),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "Browser command failed.").strip()
            raise RuntimeError(detail[:2000])
        return completed.stdout or ""

    try:
        execute(["open", "--browser=chrome", target_url.strip()])
        execute(["snapshot", f"--filename={snapshot_path}"])
        execute(["screenshot", f"--filename={screenshot_path}"])
        if not screenshot_path.is_file():
            raise RuntimeError("Browser screenshot was not created.")
        if not snapshot_path.is_file():
            raise RuntimeError("Browser snapshot was not created.")
        snapshot = snapshot_path.read_text(encoding="utf-8", errors="replace")
        return {
            "success": True,
            "target_url": target_url.strip(),
            "page_snapshot": snapshot[-30000:],
            "snapshot_path": str(snapshot_path),
            "screenshot_path": str(screenshot_path),
        }
    except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
        return {"success": False, "error": str(exc)[:2000]}
    finally:
        try:
            execute(["close"], timeout=30)
        except (OSError, RuntimeError, subprocess.SubprocessError):
            pass


@tool
def inspect_web_page(target_url: str) -> str:
    """Open an approved HTTP(S) page and return its snapshot plus screenshot path."""
    return json.dumps(browser_probe(target_url), ensure_ascii=False)
