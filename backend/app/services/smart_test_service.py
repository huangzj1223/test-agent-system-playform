"""
Smart Test Service - SSE streaming orchestration for multi-phase smart testing.

Coordinates: explorer → testcase → web_cli → report generation.
Each phase calls the appropriate agent via bridge.invoke_agent() and yields SSE events.
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.agents.bridge import invoke_agent
from app.agents.tools.web.browser_tools import browser_probe

logger = logging.getLogger(__name__)

# ============================================================================
# SSE event helpers
# ============================================================================


def _sse_event(event_type: str, data: dict[str, Any]) -> str:
    """Build a single SSE event string."""
    payload = {"type": event_type, "timestamp": datetime.now(timezone.utc).isoformat(), **data}
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _sse_phase_start(phase: str, name: str) -> str:
    return _sse_event("PHASE_START", {"phase": phase, "name": name})


def _sse_phase_progress(phase: str, message: str) -> str:
    return _sse_event("PHASE_PROGRESS", {"phase": phase, "message": message})


def _sse_phase_output(phase: str, output: dict[str, Any]) -> str:
    return _sse_event("PHASE_OUTPUT", {"phase": phase, "output": output})


def _sse_phase_complete(phase: str, summary: str = "") -> str:
    return _sse_event("PHASE_COMPLETE", {"phase": phase, "summary": summary})


def _sse_phase_error(phase: str, error: str) -> str:
    return _sse_event("PHASE_ERROR", {"phase": phase, "error": error})


def _sse_task_complete(summary: dict[str, Any]) -> str:
    return _sse_event("TASK_COMPLETE", {"summary": summary})


def _sse_task_error(error: str) -> str:
    return _sse_event("TASK_ERROR", {"error": error})


# ============================================================================
# Phase runner helpers
# ============================================================================


def _build_exploration_context(project_identifier: str, target_url: str) -> dict[str, str]:
    return {
        "project_identifier": project_identifier,
        "target_url": target_url,
    }


def _build_testcase_context(project_identifier: str, folder_id: str = "") -> dict[str, str]:
    return {
        "project_identifier": project_identifier,
        "folder_id": folder_id,
        "template_type": "test_case",
        "enable_rag": "false",
    }


def _build_web_execution_context(project_identifier: str, target_url: str) -> dict[str, str]:
    return {
        "project_identifier": project_identifier,
        "target_url": target_url,
        "folder_id": "",
    }


# ============================================================================
# Phase result schemas
# ============================================================================


@dataclass
class PhaseResult:
    phase: str
    name: str
    status: str = "pending"  # pending | running | completed | failed
    output: dict[str, Any] = field(default_factory=dict)
    error: str = ""
    started_at: str = ""
    completed_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "phase": self.phase,
            "name": self.name,
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }


@dataclass
class SmartTestTask:
    id: str
    project_identifier: str
    target_url: str
    description: str
    status: str = "pending"  # pending | running | completed | failed
    phases: list[PhaseResult] = field(default_factory=list)
    created_at: str = ""
    completed_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "project_identifier": self.project_identifier,
            "target_url": self.target_url,
            "description": self.description,
            "status": self.status,
            "phases": [p.to_dict() for p in self.phases],
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


# In-memory task store (for demo / single-instance use)
_tasks: dict[str, SmartTestTask] = {}


def get_task(task_id: str) -> SmartTestTask | None:
    return _tasks.get(task_id)


def list_tasks(project_identifier: str) -> list[SmartTestTask]:
    return [t for t in _tasks.values() if t.project_identifier == project_identifier]


# ============================================================================
# Agent invocation helper
# ============================================================================


async def _invoke_agent_safe(
    agent_name: str,
    prompt: str,
    context: dict[str, str],
    timeout_seconds: float = 360,
) -> dict[str, Any]:
    """Invoke agent with error handling and timeout."""
    try:
        # For explorer, do passive browser probe first
        if agent_name == "explorer" and context.get("target_url"):
            probe_result = await asyncio.to_thread(
                browser_probe, context["target_url"]
            )
            if probe_result.get("success"):
                snapshot = str(probe_result.get("page_snapshot", ""))[-30000:]
                screenshot = probe_result.get("screenshot_path", "")
                prompt = (
                    f"{prompt}\n\n"
                    f"已执行浏览器预检查。页面快照摘要:\n"
                    f"```yaml\n{snapshot}\n```\n"
                    f"截图路径: {screenshot}\n"
                )
            else:
                # Browser probe failed — don't crash the whole phase,
                # let the explorer agent try on its own.
                probe_error = str(probe_result.get("error", ""))[:500]
                logger.warning(
                    "Browser probe for %s returned success=false: %s",
                    context["target_url"], probe_error,
                )
                prompt = (
                    f"{prompt}\n\n"
                    f"⚠️ 浏览器预检查未成功（{probe_error}）。"
                    f"请自行使用 inspect_web_page 工具尝试打开目标页面。\n"
                )

        result = await asyncio.wait_for(
            invoke_agent(agent_name, prompt, context=context),
            timeout=timeout_seconds,
        )
        return {
            "success": True,
            "agent": agent_name,
            "content": result.get("content", ""),
            "raw": result.get("raw", {}),
        }
    except TimeoutError:
        logger.error("Agent '%s' timed out after %ss", agent_name, timeout_seconds)
        return {
            "success": False,
            "agent": agent_name,
            "error": f"智能体 '{agent_name}' 执行超时（{timeout_seconds}s）",
            "content": "",
        }
    except Exception as exc:
        logger.error("Agent '%s' failed: %s", agent_name, exc)
        traceback.print_exc()
        return {
            "success": False,
            "agent": agent_name,
            "error": f"智能体 '{agent_name}' 执行失败: {str(exc)}",
            "content": "",
        }


# ============================================================================
# Main orchestration
# ============================================================================


async def run_smart_test_stream(
    project_identifier: str,
    target_url: str,
    description: str,
) -> AsyncGenerator[str, None]:
    """
    Main SSE orchestration generator.

    Runs four phases sequentially and yields SSE events.
    """
    task_id = str(uuid4())
    task = SmartTestTask(
        id=task_id,
        project_identifier=project_identifier,
        target_url=target_url,
        description=description,
        status="running",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _tasks[task_id] = task

    phases = [
        ("exploration", "🔍 页面探测"),
        ("testcase_design", "📝 测试用例设计"),
        ("execution", "▶️ 测试执行"),
        ("report", "📊 报告生成"),
    ]

    task.phases = [
        PhaseResult(phase=key, name=name)
        for key, name in phases
    ]

    # ---- Phase 1: Exploration ----
    async for event in _run_exploration_phase(task, phases[0]):
        yield event

    # ---- Phase 2: Testcase Design ----
    async for event in _run_testcase_phase(task, phases[1]):
        yield event

    # ---- Phase 3: Execution ----
    async for event in _run_execution_phase(task, phases[2]):
        yield event

    # ---- Phase 4: Report ----
    async for event in _run_report_phase(task, phases[3]):
        yield event

    # ---- Finalize ----
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc).isoformat()

    summary = {
        "task_id": task_id,
        "target_url": target_url,
        "description": description,
        "phases": [p.to_dict() for p in task.phases],
    }
    yield _sse_task_complete(summary)


# ---- Individual phase runners ----


async def _run_exploration_phase(
    task: SmartTestTask, phase_info: tuple[str, str]
) -> AsyncGenerator[str, None]:
    """Phase 1: Open the target URL and analyze page structure."""
    phase_key, phase_name = phase_info
    phase = task.phases[0]
    phase.status = "running"
    phase.started_at = datetime.now(timezone.utc).isoformat()

    yield _sse_phase_start(phase_key, phase_name)
    yield _sse_phase_progress(phase_key, f"正在打开目标页面: {task.target_url}")

    prompt = (
        f"请分析以下目标 Web 页面，识别所有功能点和可交互元素。\n\n"
        f"## 目标URL\n{task.target_url}\n\n"
        f"## 测试背景\n{task.description}\n\n"
        f"## 要求\n"
        f"1. 首先调用 inspect_web_page(target_url=\"{task.target_url}\") 打开页面\n"
        f"2. 分析页面结构：导航菜单、按钮、表单、表格、弹窗等\n"
        f"3. 如果需要登录或深入探索，使用 execute 工具运行 playwright-cli 命令\n"
        f"4. 最后输出结构化 JSON 分析报告（包含 features 列表、navigation_structure、requires_login 等字段）\n"
    )

    result = await _invoke_agent_safe(
        "explorer",
        prompt,
        _build_exploration_context(task.project_identifier, task.target_url),
        timeout_seconds=300,
    )

    if result["success"]:
        phase.output = {
            "content": result["content"],
            "target_url": task.target_url,
        }
        phase.status = "completed"
        yield _sse_phase_output(phase_key, phase.output)
        yield _sse_phase_complete(phase_key, "页面探测完成")
    else:
        phase.status = "failed"
        phase.error = result.get("error", "未知错误")
        yield _sse_phase_error(phase_key, phase.error)
        # Don't stop - continue with partial data

    phase.completed_at = datetime.now(timezone.utc).isoformat()


async def _run_testcase_phase(
    task: SmartTestTask, phase_info: tuple[str, str]
) -> AsyncGenerator[str, None]:
    """Phase 2: Design test cases based on exploration results."""
    phase_key, phase_name = phase_info
    phase = task.phases[1]
    phase.status = "running"
    phase.started_at = datetime.now(timezone.utc).isoformat()

    yield _sse_phase_start(phase_key, phase_name)
    yield _sse_phase_progress(phase_key, "正在分析需求并设计测试用例...")

    # Build prompt with context from exploration phase
    exploration_output = task.phases[0].output.get("content", "") if task.phases[0].status == "completed" else ""

    prompt = (
        f"请根据以下信息为该 Web 页面设计测试用例。\n\n"
        f"## 测试需求\n{task.description}\n\n"
        f"## 目标URL\n{task.target_url}\n\n"
    )

    if exploration_output:
        prompt += (
            f"## 页面探测结果\n"
            f"{exploration_output[:5000]}\n\n"
        )

    prompt += (
        f"## 要求\n"
        f"1. 请按照你的标准流程（Phase 1→2→3→4→5）执行\n"
        f"2. 先进行需求分析（FULL 模式），输出需求解析报告\n"
        f"3. 制定测试策略，设计测试用例\n"
        f"4. 将测试用例导出为 Excel 格式\n"
        f"5. 使用 batch_create_test_cases_tool 将用例保存到测试用例库\n"
    )

    result = await _invoke_agent_safe(
        "testcase",
        prompt,
        _build_testcase_context(task.project_identifier),
        timeout_seconds=600,
    )

    if result["success"]:
        phase.output = {
            "content": result["content"],
        }
        phase.status = "completed"
        yield _sse_phase_output(phase_key, phase.output)
        yield _sse_phase_complete(phase_key, "测试用例设计完成")
    else:
        phase.status = "failed"
        phase.error = result.get("error", "未知错误")
        yield _sse_phase_error(phase_key, phase.error)

    phase.completed_at = datetime.now(timezone.utc).isoformat()


async def _run_execution_phase(
    task: SmartTestTask, phase_info: tuple[str, str]
) -> AsyncGenerator[str, None]:
    """Phase 3: Execute tests using web_cli agent."""
    phase_key, phase_name = phase_info
    phase = task.phases[2]
    phase.status = "running"
    phase.started_at = datetime.now(timezone.utc).isoformat()

    yield _sse_phase_start(phase_key, phase_name)
    yield _sse_phase_progress(phase_key, "正在准备执行测试...")

    # Use test_case output as context
    testcase_output = task.phases[1].output.get("content", "") if task.phases[1].status == "completed" else ""

    prompt = (
        f"请为以下 Web 页面生成并执行自动化测试。\n\n"
        f"## 目标URL\n{task.target_url}\n\n"
        f"## 测试需求\n{task.description}\n\n"
    )

    if testcase_output:
        prompt += (
            f"## 测试用例设计结果（参考）\n{testcase_output[:3000]}\n\n"
        )

    prompt += (
        f"## 要求\n"
        f"1. 首先使用 inspect_web_page(target_url=\"{task.target_url}\") 打开页面\n"
        f"2. 根据测试需求创建 Web 功能和子功能（使用 create_web_function 和 create_web_sub_function）\n"
        f"3. 生成测试计划并保存（save_web_test_plan）\n"
        f"4. 生成测试用例并保存（save_web_test_cases）\n"
        f"5. 生成 Playwright 测试脚本并保存（save_web_test_script）\n"
        f"6. 下载脚本并执行测试（download_web_script + execute_web_script）\n"
        f"7. 如果测试失败，自动尝试修复（最多3次）\n"
        f"8. 最后验证所有成果物完整性\n"
    )

    result = await _invoke_agent_safe(
        "web_cli",
        prompt,
        _build_web_execution_context(task.project_identifier, task.target_url),
        timeout_seconds=1200,
    )

    if result["success"]:
        phase.output = {
            "content": result["content"],
        }
        phase.status = "completed"
        yield _sse_phase_output(phase_key, phase.output)
        yield _sse_phase_complete(phase_key, "测试执行完成")
    else:
        phase.status = "failed"
        phase.error = result.get("error", "未知错误")
        yield _sse_phase_error(phase_key, phase.error)

    phase.completed_at = datetime.now(timezone.utc).isoformat()


async def _run_report_phase(
    task: SmartTestTask, phase_info: tuple[str, str]
) -> AsyncGenerator[str, None]:
    """Phase 4: Generate comprehensive test report."""
    phase_key, phase_name = phase_info
    phase = task.phases[3]
    phase.status = "running"
    phase.started_at = datetime.now(timezone.utc).isoformat()

    yield _sse_phase_start(phase_key, phase_name)
    yield _sse_phase_progress(phase_key, "正在汇总测试结果并生成报告...")

    # Compile report from all phase outputs
    report_sections: list[str] = []
    report_sections.append("# 智能测试综合报告\n")
    report_sections.append(f"## 测试任务\n")
    report_sections.append(f"- **目标URL**: {task.target_url}")
    report_sections.append(f"- **测试描述**: {task.description}")
    report_sections.append(f"- **任务ID**: {task.id}")
    report_sections.append(f"- **创建时间**: {task.created_at}\n")

    for i, phase in enumerate(task.phases):
        icon = "✅" if phase.status == "completed" else "❌" if phase.status == "failed" else "⏳"
        report_sections.append(f"## {icon} Phase {i+1}: {phase.name}")
        report_sections.append(f"- 状态: {phase.status}")
        if phase.error:
            report_sections.append(f"- 错误: {phase.error}")
        if phase.output.get("content"):
            content_preview = str(phase.output["content"])[:2000]
            report_sections.append(f"\n{content_preview}\n")
        report_sections.append("")

    full_report = "\n".join(report_sections)

    phase.output = {
        "report": full_report,
        "phases_summary": [
            {"name": p.name, "status": p.status} for p in task.phases
        ],
    }
    phase.status = "completed"
    phase.completed_at = datetime.now(timezone.utc).isoformat()

    yield _sse_phase_output(phase_key, phase.output)
    yield _sse_phase_complete(phase_key, "报告生成完成")


# ============================================================================
# Public API
# ============================================================================


async def execute_smart_test(
    project_identifier: str,
    target_url: str,
    description: str,
) -> AsyncGenerator[str, None]:
    """Public entry point: run smart test with SSE streaming.

    Usage:
        async for event in execute_smart_test(pid, url, desc):
            # event is an SSE-formatted string
            yield event
    """
    async for event in run_smart_test_stream(
        project_identifier=project_identifier,
        target_url=target_url,
        description=description,
    ):
        yield event
