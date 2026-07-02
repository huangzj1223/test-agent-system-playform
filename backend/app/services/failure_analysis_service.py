"""Automated test failure analysis service.

Phase 1 focuses on a unified job-level analysis flow for API, Web/UI and
scenario test runs. The service uses stored job evidence first, optionally asks
an LLM when configured, and always falls back to deterministic heuristics.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.models.failure_analysis import TestFailureAnalysis
from app.models.test_run import TestRun, TestRunScriptJob
from app.repositories.failure_analysis_repo import FailureAnalysisRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.test_run_repo import TestRunRepository, TestRunScriptJobRepository
from app.schemas.enums import JobStatus
from app.schemas.test_run import FailureAnalysisInfo
from app.utils.exceptions import BadRequestException, NotFoundException

logger = logging.getLogger(__name__)


def _clip(value: Optional[str], limit: int) -> str:
    if not value:
        return ""
    value = value.strip()
    if len(value) <= limit:
        return value
    return value[-limit:]


class FailureAnalysisService:
    """Create and query job-level failure analyses."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.project_repo = ProjectRepository(session)
        self.test_run_repo = TestRunRepository(session)
        self.job_repo = TestRunScriptJobRepository(session)
        self.analysis_repo = FailureAnalysisRepository(session)

    async def _get_project_by_identifier(self, project_identifier: str):
        project = await self.project_repo.get_by_identifier(project_identifier)
        if not project:
            raise NotFoundException(resource_type="项目", resource_id=project_identifier)
        return project

    async def _require_test_run(self, project_id: UUID, test_run_identifier: str) -> TestRun:
        test_run = await self.test_run_repo.get_by_identifier(test_run_identifier)
        if not test_run or test_run.project_id != project_id:
            raise NotFoundException(resource_type="测试运行", resource_id=test_run_identifier)
        return test_run

    async def _require_job(self, test_run: TestRun, job_id: str) -> TestRunScriptJob:
        job = await self.job_repo.get_by_id(UUID(job_id))
        if not job or job.test_run_id != test_run.id:
            raise NotFoundException(resource_type="脚本作业", resource_id=job_id)
        return job

    def _to_info(self, analysis: TestFailureAnalysis) -> FailureAnalysisInfo:
        return FailureAnalysisInfo(
            id=analysis.id,
            project_id=analysis.project_id,
            test_run_id=analysis.test_run_id,
            job_id=analysis.job_id,
            script_type=analysis.script_type,
            analysis_status=analysis.analysis_status,
            failure_category=analysis.failure_category,
            severity=analysis.severity,
            confidence=analysis.confidence,
            summary=analysis.summary,
            root_cause=analysis.root_cause,
            evidence=analysis.evidence or [],
            recommendations=analysis.recommendations or [],
            knowledge_refs=analysis.knowledge_refs or [],
            raw_context=analysis.raw_context,
            model_name=analysis.model_name,
            analysis_source=analysis.analysis_source,
            error_message=analysis.error_message,
            created_at=analysis.created_at,
            updated_at=analysis.updated_at,
        )

    async def list_by_run(
        self,
        project_identifier: str,
        test_run_identifier: str,
    ) -> list[FailureAnalysisInfo]:
        project = await self._get_project_by_identifier(project_identifier)
        test_run = await self._require_test_run(project.id, test_run_identifier)
        analyses = await self.analysis_repo.list_by_test_run(test_run.id)
        return [self._to_info(item) for item in analyses]

    async def get_by_job(
        self,
        project_identifier: str,
        test_run_identifier: str,
        job_id: str,
    ) -> FailureAnalysisInfo:
        project = await self._get_project_by_identifier(project_identifier)
        test_run = await self._require_test_run(project.id, test_run_identifier)
        job = await self._require_job(test_run, job_id)
        analysis = await self.analysis_repo.get_by_job_id(job.id)
        if not analysis:
            raise NotFoundException(resource_type="失败分析", resource_id=job_id)
        return self._to_info(analysis)

    async def analyze_run_failures(
        self,
        project_identifier: str,
        test_run_identifier: str,
        *,
        force: bool = False,
    ) -> list[FailureAnalysisInfo]:
        project = await self._get_project_by_identifier(project_identifier)
        test_run = await self._require_test_run(project.id, test_run_identifier)
        jobs, _ = await self.job_repo.get_by_test_run(test_run.id, offset=0, limit=1000)
        failed_jobs = [job for job in jobs if self._is_failed_job(job)]
        if not failed_jobs:
            return []

        results = []
        for job in failed_jobs:
            results.append(
                await self._analyze_job(project.id, test_run, job, force=force)
            )
        return results

    async def analyze_job_failure(
        self,
        project_identifier: str,
        test_run_identifier: str,
        job_id: str,
        *,
        force: bool = False,
    ) -> FailureAnalysisInfo:
        project = await self._get_project_by_identifier(project_identifier)
        test_run = await self._require_test_run(project.id, test_run_identifier)
        job = await self._require_job(test_run, job_id)
        if not self._is_failed_job(job):
            raise BadRequestException(message="当前脚本作业没有失败结果，暂不生成失败分析")
        return await self._analyze_job(project.id, test_run, job, force=force)

    async def _analyze_job(
        self,
        project_id: UUID,
        test_run: TestRun,
        job: TestRunScriptJob,
        *,
        force: bool,
    ) -> FailureAnalysisInfo:
        existing = await self.analysis_repo.get_by_job_id(job.id)
        if existing and not force:
            return self._to_info(existing)

        context = self._build_context(job)
        heuristic = self._heuristic_analysis(context)
        llm_result = await self._try_llm_analysis(context, heuristic)
        result = llm_result or heuristic

        values = {
            "project_id": project_id,
            "test_run_id": test_run.id,
            "job_id": job.id,
            "script_type": job.script_type,
            "analysis_status": "completed",
            "failure_category": result["failure_category"],
            "severity": result["severity"],
            "confidence": int(result.get("confidence", 0)),
            "summary": result["summary"],
            "root_cause": result.get("root_cause"),
            "evidence": result.get("evidence", []),
            "recommendations": result.get("recommendations", []),
            "knowledge_refs": result.get("knowledge_refs", []),
            "raw_context": context,
            "model_name": result.get("model_name"),
            "analysis_source": result.get("analysis_source", "heuristic"),
            "error_message": result.get("error_message"),
        }
        analysis = await self.analysis_repo.upsert_for_job(values)
        return self._to_info(analysis)

    def _is_failed_job(self, job: TestRunScriptJob) -> bool:
        summary = job.result_summary or {}
        return job.status == JobStatus.FAILED or int(summary.get("failed") or 0) > 0

    def _build_context(self, job: TestRunScriptJob) -> dict[str, Any]:
        return {
            "job_id": str(job.id),
            "script_type": job.script_type.value if job.script_type else None,
            "script_id": str(job.script_id),
            "script_identifier": job.script_identifier,
            "script_name": job.script_name,
            "status": job.status.value if job.status else None,
            "duration_ms": job.duration_ms,
            "result_summary": job.result_summary or {},
            "error_message": _clip(job.error_message, 5000),
            "stderr_tail": _clip(job.stderr, 12000),
            "stdout_tail": _clip(job.stdout, 12000),
            "report_path": job.report_path,
        }

    def _combined_text(self, context: dict[str, Any]) -> str:
        return "\n".join(
            str(context.get(key) or "")
            for key in ("error_message", "stderr_tail", "stdout_tail")
        )

    def _extract_evidence(self, context: dict[str, Any]) -> list[dict[str, str]]:
        keywords = (
            "error",
            "failed",
            "timeout",
            "expect",
            "assert",
            "traceback",
            "exception",
            "econn",
            "enotfound",
            "syntaxerror",
            "referenceerror",
            "locator",
            "status",
        )
        evidence: list[dict[str, str]] = []
        for source in ("error_message", "stderr_tail", "stdout_tail"):
            text = str(context.get(source) or "")
            for line in text.splitlines():
                clean = line.strip()
                if not clean:
                    continue
                lower = clean.lower()
                if any(k in lower for k in keywords):
                    evidence.append({"source": source, "message": _clip(clean, 500)})
                if len(evidence) >= 8:
                    return evidence
        return evidence

    def _heuristic_analysis(self, context: dict[str, Any]) -> dict[str, Any]:
        text = self._combined_text(context)
        lower = text.lower()
        script_type = context.get("script_type") or "unknown"
        summary = context.get("result_summary") or {}
        failed_count = int(summary.get("failed") or 0)
        evidence = self._extract_evidence(context)

        category = "unknown"
        severity = "medium"
        confidence = 45
        root_cause = "当前证据不足，需要结合完整报告、被测服务日志或代码变更继续确认。"
        recommendations = [
            "查看执行日志和 HTML 报告，确认失败步骤与断言位置。",
            "补充被测服务日志、接口响应或页面截图后重新分析。",
        ]

        if re.search(r"\b5\d{2}\b|internal server error|server error", lower):
            category = "product_bug"
            severity = "high"
            confidence = 78
            root_cause = "失败日志出现服务端 5xx 或内部错误，更可能是被测系统异常。"
            recommendations = [
                "定位对应接口或页面请求的服务端日志。",
                "结合最近 git diff 检查业务逻辑、数据访问和异常处理改动。",
                "把该失败样本沉淀为回归 badcase。",
            ]
        elif any(token in lower for token in ("expect(", "expected", "received", "assertionerror", "toequal", "tobe")):
            category = "assertion_mismatch"
            severity = "medium"
            confidence = 74
            root_cause = "失败集中在断言期望与实际结果不一致。"
            recommendations = [
                "确认需求或接口契约是否已变更。",
                "检查断言是否过强、字段是否动态变化、测试数据是否稳定。",
                "若产品行为正确，更新自动化脚本断言和测试用例预期。",
            ]
        elif any(token in lower for token in ("syntaxerror", "referenceerror", "typeerror", "cannot find module", "module not found")):
            category = "test_script_error"
            severity = "high"
            confidence = 82
            root_cause = "脚本运行时出现语法、引用或依赖错误，更可能是自动化脚本自身问题。"
            recommendations = [
                "检查生成脚本的 import、变量名、fixture 和依赖版本。",
                "在本地 workspace 单独运行该 spec，先修复编译或运行时错误。",
                "把错误样本加入生成器/修复器的 badcase 集。",
            ]
        elif any(token in lower for token in ("locator", "strict mode violation", "not visible", "not attached", "waiting for selector")):
            category = "ui_locator_issue"
            severity = "medium"
            confidence = 76
            root_cause = "UI 自动化定位器或页面状态等待失败。"
            recommendations = [
                "检查目标元素是否改名、隐藏、异步加载或存在多个匹配节点。",
                "优先使用稳定的 role/test-id 定位器，并补充显式状态等待。",
                "结合截图或 trace 判断是产品 UI 变化还是脚本定位问题。",
            ]
        elif any(token in lower for token in ("timeout", "timed out", "超时")):
            category = "timeout_or_flaky"
            severity = "medium"
            confidence = 70
            root_cause = "日志显示执行或等待超时，可能来自环境抖动、接口变慢或等待条件不稳定。"
            recommendations = [
                "对比历史执行耗时和失败频率，判断是否为 flaky。",
                "检查服务可用性、网络延迟、测试数据准备和等待条件。",
                "避免只增加超时时间，优先补充确定性的状态判断。",
            ]
        elif any(token in lower for token in ("econnrefused", "enotfound", "etimedout", "net::err", "npx 不可用", "browser closed")):
            category = "environment_issue"
            severity = "high"
            confidence = 78
            root_cause = "失败证据指向网络、依赖或执行环境异常。"
            recommendations = [
                "检查 base_url、DNS、服务端口、Node/Playwright 依赖和浏览器安装。",
                "确认 CI/执行机环境变量与本地配置一致。",
                "环境恢复后重跑该 job，避免直接修改测试逻辑。",
            ]
        elif re.search(r"\b404\b|not found", lower) and script_type == "api_test":
            category = "test_data_issue"
            severity = "medium"
            confidence = 65
            root_cause = "API 测试出现资源不存在类响应，可能是测试数据准备或接口路径问题。"
            recommendations = [
                "确认前置数据是否创建成功、测试 ID 是否过期或被其他用例清理。",
                "检查 OpenAPI 路径、base_url 和请求参数拼接。",
                "为数据依赖添加 setup/teardown 和幂等保护。",
            ]

        if failed_count >= 5 and severity == "medium":
            severity = "high"

        return {
            "failure_category": category,
            "severity": severity,
            "confidence": confidence,
            "summary": f"{context.get('script_name') or context.get('script_identifier') or context.get('job_id')} 失败，初步归因为 {category}。",
            "root_cause": root_cause,
            "evidence": evidence,
            "recommendations": recommendations,
            "knowledge_refs": [],
            "analysis_source": "heuristic",
            "model_name": None,
        }

    async def _try_llm_analysis(
        self,
        context: dict[str, Any],
        fallback: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        if not settings.deepseek_api_key:
            return None

        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_deepseek import ChatDeepSeek

            model = ChatDeepSeek(
                api_key=settings.deepseek_api_key,
                base_url=settings.llm_api_base,
                model=settings.llm_model,
                temperature=0.1,
                max_tokens=1800,
                timeout=60,
                max_retries=2,
                extra_body={"thinking": {"type": "disabled"}},
            )
            prompt = {
                "task": "Analyze an automated test failure and return strict JSON.",
                "allowed_failure_category": [
                    "product_bug",
                    "test_script_error",
                    "assertion_mismatch",
                    "ui_locator_issue",
                    "timeout_or_flaky",
                    "environment_issue",
                    "test_data_issue",
                    "unknown",
                ],
                "required_json_schema": {
                    "failure_category": "string",
                    "severity": "critical|high|medium|low",
                    "confidence": "integer 0-100",
                    "summary": "Chinese one sentence",
                    "root_cause": "Chinese paragraph",
                    "evidence": [{"source": "string", "message": "string"}],
                    "recommendations": ["Chinese actionable item"],
                },
                "context": context,
                "heuristic_hint": fallback,
            }
            response = await model.ainvoke(
                [
                    SystemMessage(
                        content=(
                            "你是资深测试架构师，负责自动化失败归因。"
                            "只输出 JSON，不要 Markdown。"
                        )
                    ),
                    HumanMessage(content=json.dumps(prompt, ensure_ascii=False)),
                ]
            )
            content = str(getattr(response, "content", "") or "")
            parsed = self._parse_llm_json(content)
            if not parsed:
                return None
            parsed.setdefault("evidence", fallback.get("evidence", []))
            parsed.setdefault("recommendations", fallback.get("recommendations", []))
            parsed["analysis_source"] = "llm"
            parsed["model_name"] = settings.llm_model
            parsed["knowledge_refs"] = []
            return parsed
        except Exception as exc:
            logger.warning("[FailureAnalysisService] LLM analysis fallback: %s", exc)
            return None

    def _parse_llm_json(self, content: str) -> Optional[dict[str, Any]]:
        content = content.strip()
        if not content:
            return None
        match = re.search(r"\{.*\}", content, re.S)
        if match:
            content = match.group(0)
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return None

        required = ("failure_category", "severity", "confidence", "summary")
        if any(key not in data for key in required):
            return None
        data["confidence"] = max(0, min(100, int(data.get("confidence") or 0)))
        if not isinstance(data.get("evidence"), list):
            data["evidence"] = []
        if not isinstance(data.get("recommendations"), list):
            data["recommendations"] = []
        return data
