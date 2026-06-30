"""Phase 1 浏览器快照：带硬超时的单次采集，避免 execute + agent-browser 挂死。"""

from __future__ import annotations

import json
import os
import subprocess
from typing import Any


DEFAULT_TIMEOUT_SECONDS = 25

_LOGIN_URL_HINTS = ("login", "signin", "sign-in", "auth")
_LOGIN_PAGE_HINTS = (
    "login",
    "sign in",
    "登录",
    "密码",
    "password",
    "username",
    "账号",
    "验证码",
)


def _detect_login_page(snapshot: str, url: str) -> bool:
    """根据 URL 与快照文本判断是否落在登录页。"""
    url_lower = (url or "").lower()
    if any(hint in url_lower for hint in _LOGIN_URL_HINTS):
        return True
    text_lower = (snapshot or "").lower()
    if not text_lower:
        return False
    hits = sum(1 for hint in _LOGIN_PAGE_HINTS if hint in text_lower)
    return hits >= 2


def capture_page_snapshot_impl(
    url: str,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    """打开 URL → snapshot -i → close，全程 subprocess 硬超时。"""
    url = (url or "").strip()
    if not url.startswith(("http://", "https://")):
        return {
            "ok": False,
            "error": "invalid_url",
            "message": "URL 必须以 http:// 或 https:// 开头",
        }

    timeout_seconds = max(10, min(int(timeout_seconds), 45))
    env = {
        **os.environ,
        "AGENT_BROWSER_DEFAULT_TIMEOUT": "15000",
        "AGENT_BROWSER_HEADED": os.environ.get("AGENT_BROWSER_HEADED", "0"),
    }
    # 单条命令链：避免多次 execute 导致会话挂起
    command = (
        f'agent-browser open "{url}" --json '
        f'&& agent-browser snapshot -i --json '
        f"&& agent-browser close"
    )

    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
            shell=True,
            env=env,
        )
    except subprocess.TimeoutExpired:
        _try_close_browser(env)
        return {
            "ok": False,
            "error": "timeout",
            "message": f"浏览器命令在 {timeout_seconds}s 内未完成，已中止 URL 探索",
            "url": url,
        }
    except FileNotFoundError:
        return {
            "ok": False,
            "error": "agent_browser_not_found",
            "message": "未找到 agent-browser，请安装: npm i -g agent-browser",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "subprocess_error",
            "message": str(exc),
        }

    stdout = (proc.stdout or "").strip()
    stderr = (proc.stderr or "").strip()
    combined = f"{stdout}\n{stderr}".lower()

    if proc.returncode != 0 or any(
        kw in combined
        for kw in (
            "error",
            "not found",
            "enoent",
            "command not found",
            "failed",
            "timeout",
        )
    ):
        return {
            "ok": False,
            "error": "command_failed",
            "returncode": proc.returncode,
            "stdout": stdout[-4000:] if stdout else "",
            "stderr": stderr[-2000:] if stderr else "",
            "message": "浏览器快照失败，请基于用户提供的操作步骤继续需求解析",
            "url": url,
        }

    snapshot_text = stdout[-12000:] if stdout else ""
    requires_login = _detect_login_page(snapshot_text, url)
    result: dict[str, Any] = {
        "ok": True,
        "url": url,
        "snapshot": snapshot_text,
        "requires_login": requires_login,
    }
    if requires_login:
        result["next_action"] = "skip_browser_login"
        result["message"] = (
            "快照显示为登录页。禁止用 execute/agent-browser 登录或再次打开浏览器（避免挂死）。"
            "请标注 [URL探索: 仅采集到登录页]，将「需登录」写入前置条件。"
            "若用户已提供菜单操作步骤则摘录进需求解析；若未提供，将导航路径列入"
            "「需澄清问题」并请用户补充后暂停；澄清解决或无澄清项时按 Phase 1 门控继续，"
            "禁止第二次 snapshot 或未澄清即用假定路径进入 Phase 2。"
        )
    else:
        result["message"] = "页面快照采集成功，请解析 snapshot 中的菜单/按钮/字段信息"
    return result


def _try_close_browser(env: dict[str, str]) -> None:
    try:
        subprocess.run(
            "agent-browser close",
            capture_output=True,
            timeout=5,
            shell=True,
            env=env,
        )
    except Exception:
        pass
