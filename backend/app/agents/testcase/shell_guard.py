"""testcase Agent 的 Shell 守卫：拦截危险 execute（浏览器挂死、误删 exports）。"""

from __future__ import annotations

import re
from pathlib import Path

from deepagents.backends.local_shell import LocalShellBackend
from deepagents.backends.protocol import ExecuteResponse

_EXPORTS_DIR = Path(__file__).resolve().parents[4] / "exports"

_BLOCK_MESSAGE = (
    "[已拦截] testcase Agent 禁止通过 execute 运行 agent-browser / playwright。\n"
    "Phase 1 URL 探索只能调用 capture_page_snapshot（最多 1 次，内置 25s 硬超时）。\n"
    "若快照为登录页或探索失败：标注 [URL探索: 仅登录页/已中止]；"
    "有用户步骤则用用户步骤，无步骤则从 RAG/本地用例/需求文档或通用模板补全菜单路径，"
    "完成需求解析并立即进入 Phase 2，禁止再次打开浏览器或尝试登录。"
)

_BROWSER_COMMAND = re.compile(
    r"(?:^|[;&|]\s*|\b)(?:npx\s+)?agent-browser\b|"
    r"(?:^|[;&|]\s*|\b)(?:npx\s+)?playwright(?:\s+|-cli|\s+test\b)",
    re.IGNORECASE,
)

# 禁止对项目 exports/ 目录做批量删除或清空（重新导出须用 export_testcases_to_excel）
_DESTRUCTIVE_EXPORTS = re.compile(
    r"(?:\brm\b|\bdel\b|\brmdir\b|\brd\b|Remove-Item|shutil\.rmtree|os\.remove|"
    r"unlink\s*\(|rmtree\s*\()"
    r"[^\n\r]{0,200}?\bexports\b",
    re.IGNORECASE,
)

_EXPORTS_BLOCK_MESSAGE = (
    "[已拦截] 禁止通过 execute 删除或清空项目 exports/ 目录下的文件。\n"
    "重新导出请：\n"
    "1. 仅调用 export_testcases_to_excel（修正本批用例的 preconditions/前提与约束 后重试）；\n"
    "2. 需全新文件时用 append=False 并指定**新** output_path（带时间戳），勿删除旧文件；\n"
    "3. 已成功 append 的批次不要重复导出。"
)


def is_blocked_browser_command(command: str) -> bool:
    """是否属于应拦截的浏览器自动化命令。"""
    if not command or not isinstance(command, str):
        return False
    return bool(_BROWSER_COMMAND.search(command))


def is_blocked_exports_destructive_command(command: str) -> bool:
    """是否试图删除/清空 exports 目录（含绝对路径）。"""
    if not command or not isinstance(command, str):
        return False
    if _DESTRUCTIVE_EXPORTS.search(command):
        return True
    exports_marker = str(_EXPORTS_DIR).lower()
    lowered = command.lower()
    if re.search(r"\bexports\b", lowered) and re.search(
        r"\b(rm|del|rmdir|rd|remove-item|unlink|rmtree)\b", lowered, re.IGNORECASE
    ):
        return True
    return False


class TestcaseShellBackend(LocalShellBackend):
    """在 LocalShellBackend 上拦截会导致挂死的浏览器 execute 命令。"""

    def execute(
        self,
        command: str,
        *,
        timeout: int | None = None,
    ) -> ExecuteResponse:
        if is_blocked_browser_command(command):
            return ExecuteResponse(
                output=_BLOCK_MESSAGE,
                exit_code=1,
                truncated=False,
            )
        if is_blocked_exports_destructive_command(command):
            return ExecuteResponse(
                output=_EXPORTS_BLOCK_MESSAGE,
                exit_code=1,
                truncated=False,
            )
        return super().execute(command, timeout=timeout)
