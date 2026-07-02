"""Closed-loop orchestration for failed automated test jobs.

The first version persists loop state and produces a strategy-specific
remediation plan. Actual script editing and rerun execution can be plugged into
the execute/verify phases without changing the API shape.
"""

from __future__ import annotations

from typing import Any, Iterable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.failure_analysis import TestFailureAnalysis
from app.models.loop import TestFailureLoopRun, TestFailureLoopStep
from app.models.test_run import TestRun, TestRunScriptJob
from app.repositories.failure_analysis_repo import FailureAnalysisRepository
from app.repositories.loop_repo import TestFailureLoopRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.test_run_repo import TestRunRepository, TestRunScriptJobRepository
from app.schemas.enums import JobStatus, ScriptType
from app.schemas.loop import (
    FailureLoopRunInfo,
    FailureLoopStartRequest,
    FailureLoopStartResult,
    FailureLoopStepInfo,
)
from app.services.failure_analysis_service import FailureAnalysisService
from app.services.failure_loop_repair_service import FailureLoopRepairService
from app.utils.exceptions import BadRequestException, NotFoundException


API_REMEDIATION_ACTIONS = {
    "assertion_mismatch": [
        "Compare the assertion with the current API contract and update only stale expectations.",
        "Capture request/response samples before changing the script.",
    ],
    "test_data_issue": [
        "Add deterministic setup data or precondition API calls.",
        "Avoid hard-coded expired resource ids.",
    ],
    "environment_issue": [
        "Check base_url, environment variables, dependency installation, and service availability.",
        "Do not change test logic until the environment is confirmed healthy.",
    ],
    "product_bug": [
        "Keep the failing case as a regression sample.",
        "Open or link a product defect instead of weakening assertions.",
    ],
    "test_script_error": [
        "Fix imports, fixtures, generated variables, and request construction.",
        "Run the target script before broad reruns.",
    ],
}

UI_REMEDIATION_ACTIONS = {
    "ui_locator_issue": [
        "Prefer role/test-id locators over brittle text or CSS selectors.",
        "Add explicit visibility/state waits around dynamic UI transitions.",
    ],
    "timeout_or_flaky": [
        "Replace fixed waits with deterministic network or element-state waits.",
        "Check whether trace/video shows a product delay or script timing issue.",
    ],
    "assertion_mismatch": [
        "Confirm whether visible copy, route, or component state changed intentionally.",
        "Update the assertion only after comparing screenshots or trace evidence.",
    ],
    "environment_issue": [
        "Check browser installation, base URL, login state, and test account availability.",
        "Rerun once after environment recovery before editing script logic.",
    ],
    "test_script_error": [
        "Fix Playwright syntax, fixture usage, and page-object references.",
        "Run the single spec before retrying the whole test run.",
    ],
}


class FailureLoopService:
    """Create and inspect closed-loop failure handling runs."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.project_repo = ProjectRepository(session)
        self.test_run_repo = TestRunRepository(session)
        self.job_repo = TestRunScriptJobRepository(session)
        self.analysis_repo = FailureAnalysisRepository(session)
        self.loop_repo = TestFailureLoopRepository(session)
        self.analysis_service = FailureAnalysisService(session)
        self.repair_service = FailureLoopRepairService(session)

    async def list_by_run(
        self,
        project_identifier: str,
        test_run_identifier: str,
    ) -> list[FailureLoopRunInfo]:
        project = await self._get_project(project_identifier)
        test_run = await self._get_test_run(project.id, test_run_identifier)
        loop_runs = await self.loop_repo.list_by_test_run(test_run.id)
        synced_runs = []
        for item in loop_runs:
            synced_runs.append(await self._maybe_sync_verification_result(item, test_run))
        if synced_runs:
            await self.session.commit()
        return [self._to_run_info(item) for item in synced_runs]

    async def get_loop_run(
        self,
        project_identifier: str,
        test_run_identifier: str,
        loop_run_id: str,
    ) -> FailureLoopRunInfo:
        project = await self._get_project(project_identifier)
        test_run = await self._get_test_run(project.id, test_run_identifier)
        loop_run = await self.loop_repo.get_run(UUID(loop_run_id))
        if not loop_run or loop_run.test_run_id != test_run.id:
            raise NotFoundException(resource_type="failure loop", resource_id=loop_run_id)
        loop_run = await self._maybe_sync_verification_result(loop_run, test_run)
        await self.session.commit()
        loaded = await self.loop_repo.get_run(loop_run.id) or loop_run
        return self._to_run_info(loaded)

    async def continue_failure_loop(
        self,
        project_identifier: str,
        test_run_identifier: str,
        loop_run_id: str,
    ) -> FailureLoopRunInfo:
        """Submit the verification execution for an existing failure loop."""
        project = await self._get_project(project_identifier)
        test_run = await self._get_test_run(project.id, test_run_identifier)
        loop_run = await self.loop_repo.get_run(UUID(loop_run_id))
        if not loop_run or loop_run.test_run_id != test_run.id:
            raise NotFoundException(resource_type="failure loop", resource_id=loop_run_id)
        if test_run.run_state.value == "in_progress":
            raise BadRequestException(message="当前测试运行正在执行中，暂不能继续闭环验证。")
        if loop_run.current_iteration >= loop_run.max_iterations:
            await self.loop_repo.update_run(
                loop_run,
                {
                    "status": "blocked",
                    "current_phase": "stopped",
                    "stop_reason": "max_iterations_reached",
                },
            )
            loaded = await self.loop_repo.get_run(loop_run.id) or loop_run
            return self._to_run_info(loaded)

        jobs = await self._select_loop_jobs(test_run, loop_run)
        retryable_jobs = [
            job
            for job in jobs
            if job.status in (JobStatus.FAILED, JobStatus.SKIPPED, JobStatus.CANCELLED)
        ]
        if not retryable_jobs:
            raise BadRequestException(message="闭环关联作业当前没有可重试的失败、跳过或取消状态。")

        before_snapshot = [self._job_snapshot(job) for job in jobs]
        next_iteration = loop_run.current_iteration + 1
        for job in retryable_jobs:
            job.status = JobStatus.PENDING
            job.retry_count = job.retry_count + 1
            job.error_message = None
            job.stdout = None
            job.stderr = None
            job.result_summary = None
            job.report_path = None
            job.duration_ms = None
            job.started_at = None
            job.completed_at = None
            await self.job_repo.update(job)

        await self.loop_repo.add_step(
            {
                "loop_run_id": loop_run.id,
                "iteration": next_iteration,
                "step_order": 1,
                "phase": "verify",
                "status": "completed",
                "action": "submit_verification_rerun",
                "input_snapshot": {"jobs_before_retry": before_snapshot},
                "output_summary": "已重置失败作业并提交测试运行到后台执行，用于验证闭环修复计划。",
                "artifacts": {
                    "retried_job_ids": [str(job.id) for job in retryable_jobs],
                    "execution_scope": "test_run",
                },
                "verification_result": {
                    "status": "submitted",
                    "success_condition": "目标作业通过且失败数量不增加",
                },
            }
        )
        loop_run = await self.loop_repo.update_run(
            loop_run,
            {
                "status": "running",
                "current_phase": "verify",
                "current_iteration": next_iteration,
                "stop_reason": None,
                "final_result": {
                    **(loop_run.final_result or {}),
                    "verification_submitted": True,
                    "retried_job_ids": [str(job.id) for job in retryable_jobs],
                },
            },
        )
        await self.session.flush()

        from app.services.test_run_service import TestRunService

        await TestRunService(self.session).execute_test_run(project_identifier, test_run_identifier)
        loaded = await self.loop_repo.get_run(loop_run.id) or loop_run
        return self._to_run_info(loaded)
    async def start_failure_loop(
        self,
        project_identifier: str,
        test_run_identifier: str,
        request: FailureLoopStartRequest,
    ) -> FailureLoopStartResult:
        project = await self._get_project(project_identifier)
        test_run = await self._get_test_run(project.id, test_run_identifier)
        jobs = await self._select_failed_jobs(test_run, request.job_id)
        if not jobs:
            raise BadRequestException(message="No failed script jobs are available for failure loop handling.")

        primary_job = jobs[0]
        strategy = self._resolve_strategy(primary_job.script_type, request.strategy)
        analyses = []
        for job in jobs:
            analysis_info = await self.analysis_service.analyze_job_failure(
                project_identifier,
                test_run_identifier,
                str(job.id),
                force=request.force_analysis,
            )
            analyses.append(analysis_info)

        context = self._build_loop_context(test_run, jobs, analyses, dry_run=request.dry_run)
        loop_run = await self.loop_repo.create_run(
            {
                "project_id": project.id,
                "test_run_id": test_run.id,
                "job_id": primary_job.id if request.job_id else None,
                "script_type": primary_job.script_type,
                "strategy": strategy,
                "goal": self._build_goal(test_run, jobs, strategy),
                "status": "running",
                "current_phase": "discover",
                "current_iteration": 1,
                "max_iterations": request.max_iterations,
                "safety_flags": self._build_safety_flags(request),
                "context_snapshot": context,
            }
        )

        await self._add_initial_steps(loop_run, strategy, analyses, context, request)
        repair_outcomes = await self._apply_repairs(loop_run, jobs, analyses, request)
        final_result = self._build_final_result(strategy, analyses, request, repair_outcomes)
        loop_run = await self.loop_repo.update_run(
            loop_run,
            {
                "status": final_result["status"],
                "current_phase": "stopped",
                "stop_reason": final_result["stop_reason"],
                "final_result": final_result,
            },
        )
        loaded = await self.loop_repo.get_run(loop_run.id) or loop_run
        return FailureLoopStartResult(
            loop_run=self._to_run_info(loaded),
            analyses=analyses,
        )

    async def _apply_repairs(
        self,
        loop_run: TestFailureLoopRun,
        jobs: list[TestRunScriptJob],
        analyses: list[Any],
        request: FailureLoopStartRequest,
    ) -> list[dict[str, Any]]:
        outcomes = await self.repair_service.repair_jobs(
            loop_run_id=loop_run.id,
            jobs=jobs,
            analyses=analyses,
            dry_run=request.dry_run,
        )
        outcome_dicts = [item.as_dict() for item in outcomes]
        applied_count = sum(1 for item in outcome_dicts if item.get("status") == "applied")
        planned_count = sum(1 for item in outcome_dicts if item.get("status") == "planned")
        failed_count = sum(1 for item in outcome_dicts if item.get("status") == "failed")
        await self.loop_repo.add_step(
            {
                "loop_run_id": loop_run.id,
                "iteration": loop_run.current_iteration,
                "step_order": 6,
                "phase": "execute",
                "status": "completed" if failed_count == 0 else "failed",
                "action": "apply_script_repairs" if not request.dry_run else "plan_script_repairs",
                "output_summary": (
                    f"Applied {applied_count} script repair(s); {failed_count} failed."
                    if not request.dry_run
                    else f"Planned {planned_count} script repair(s); no scripts were modified."
                ),
                "artifacts": {
                    "dry_run": request.dry_run,
                    "repair_outcomes": outcome_dicts,
                    "applied_count": applied_count,
                    "planned_count": planned_count,
                    "failed_count": failed_count,
                },
            }
        )
        return outcome_dicts

    async def _get_project(self, project_identifier: str):
        project = await self.project_repo.get_by_identifier(project_identifier)
        if not project:
            raise NotFoundException(resource_type="project", resource_id=project_identifier)
        return project

    async def _get_test_run(self, project_id: UUID, test_run_identifier: str) -> TestRun:
        test_run = await self.test_run_repo.get_by_identifier(test_run_identifier)
        if not test_run or test_run.project_id != project_id:
            raise NotFoundException(resource_type="test run", resource_id=test_run_identifier)
        return test_run

    async def _select_failed_jobs(
        self,
        test_run: TestRun,
        job_id: str | None,
    ) -> list[TestRunScriptJob]:
        if job_id:
            job = await self.job_repo.get_by_id(UUID(job_id))
            if not job or job.test_run_id != test_run.id:
                raise NotFoundException(resource_type="script job", resource_id=job_id)
            return [job] if self._is_failed_job(job) else []

        jobs, _ = await self.job_repo.get_by_test_run(test_run.id, offset=0, limit=1000)
        return [job for job in jobs if self._is_failed_job(job)]

    async def _maybe_sync_verification_result(
        self,
        loop_run: TestFailureLoopRun,
        test_run: TestRun,
    ) -> TestFailureLoopRun:
        if loop_run.status != "running" or loop_run.current_phase != "verify":
            return loop_run

        jobs = await self._select_loop_jobs(test_run, loop_run)
        if not jobs:
            return loop_run

        active_statuses = {JobStatus.PENDING, JobStatus.RUNNING}
        if any(job.status in active_statuses for job in jobs):
            return loop_run

        failed_jobs = [job for job in jobs if self._is_failed_job(job)]
        final_status = "completed" if not failed_jobs else "needs_human_review"
        stop_reason = "verification_passed" if not failed_jobs else "verification_failed"
        verification_result = {
            "status": final_status,
            "passed_job_ids": [str(job.id) for job in jobs if job.status == JobStatus.COMPLETED],
            "failed_job_ids": [str(job.id) for job in failed_jobs],
            "job_snapshots": [self._job_snapshot(job) for job in jobs],
        }
        await self.loop_repo.add_step(
            {
                "loop_run_id": loop_run.id,
                "iteration": loop_run.current_iteration,
                "step_order": 2,
                "phase": "iterate",
                "status": "completed",
                "action": "evaluate_verification_result",
                "output_summary": (
                    "验证执行已通过，闭环完成。"
                    if not failed_jobs
                    else "验证执行后仍存在失败，转为人工确认。"
                ),
                "artifacts": verification_result,
                "verification_result": verification_result,
            }
        )
        return await self.loop_repo.update_run(
            loop_run,
            {
                "status": final_status,
                "current_phase": "stopped",
                "stop_reason": stop_reason,
                "final_result": {
                    **(loop_run.final_result or {}),
                    "verification_result": verification_result,
                },
            },
        )
    async def _select_loop_jobs(
        self,
        test_run: TestRun,
        loop_run: TestFailureLoopRun,
    ) -> list[TestRunScriptJob]:
        if loop_run.job_id:
            job = await self.job_repo.get_by_id(loop_run.job_id)
            if not job or job.test_run_id != test_run.id:
                raise NotFoundException(resource_type="script job", resource_id=str(loop_run.job_id))
            return [job]

        job_ids = []
        for item in (loop_run.context_snapshot or {}).get("jobs", []):
            if isinstance(item, dict) and item.get("id"):
                job_ids.append(str(item["id"]))

        jobs: list[TestRunScriptJob] = []
        for job_id in job_ids:
            job = await self.job_repo.get_by_id(UUID(job_id))
            if job and job.test_run_id == test_run.id:
                jobs.append(job)
        if jobs:
            return jobs

        all_jobs, _ = await self.job_repo.get_by_test_run(test_run.id, offset=0, limit=1000)
        return [job for job in all_jobs if self._is_failed_job(job)]

    def _job_snapshot(self, job: TestRunScriptJob) -> dict[str, Any]:
        return {
            "id": str(job.id),
            "script_type": job.script_type.value if job.script_type else None,
            "script_identifier": job.script_identifier,
            "script_name": job.script_name,
            "status": job.status.value if job.status else None,
            "retry_count": job.retry_count,
            "result_summary": job.result_summary or {},
            "error_message": job.error_message,
        }
    def _is_failed_job(self, job: TestRunScriptJob) -> bool:
        summary = job.result_summary or {}
        return job.status == JobStatus.FAILED or int(summary.get("failed") or 0) > 0

    def _resolve_strategy(self, script_type: ScriptType, requested: str | None) -> str:
        if requested:
            if requested not in {"api_failure", "ui_failure"}:
                raise BadRequestException(message="strategy must be api_failure or ui_failure.")
            return requested
        if script_type in {ScriptType.API_TEST, ScriptType.SCENARIO}:
            return "api_failure"
        if script_type == ScriptType.WEB_TEST:
            return "ui_failure"
        return "api_failure"

    def _build_goal(self, test_run: TestRun, jobs: list[TestRunScriptJob], strategy: str) -> str:
        scope = "job" if len(jobs) == 1 else "run"
        return (
            f"Handle {len(jobs)} failed {scope} in test run {test_run.identifier} "
            f"using {strategy}, produce a verified remediation plan, and stop safely."
        )

    def _build_safety_flags(self, request: FailureLoopStartRequest) -> list[dict[str, Any]]:
        flags = [
            {"name": "max_iterations", "value": request.max_iterations},
            {"name": "dry_run", "value": request.dry_run},
            {"name": "requires_human_for_destructive_actions", "value": True},
        ]
        if request.dry_run:
            flags.append({"name": "no_script_mutation", "value": True})
        return flags

    def _build_loop_context(
        self,
        test_run: TestRun,
        jobs: list[TestRunScriptJob],
        analyses: list[Any],
        *,
        dry_run: bool,
    ) -> dict[str, Any]:
        return {
            "test_run": {
                "id": str(test_run.id),
                "identifier": test_run.identifier,
                "name": test_run.name,
                "run_state": test_run.run_state.value if test_run.run_state else None,
            },
            "jobs": [
                {
                    "id": str(job.id),
                    "script_type": job.script_type.value,
                    "script_identifier": job.script_identifier,
                    "script_name": job.script_name,
                    "status": job.status.value if job.status else None,
                    "result_summary": job.result_summary or {},
                    "retry_count": job.retry_count,
                    "report_path": job.report_path,
                }
                for job in jobs
            ],
            "analysis_ids": [str(item.id) for item in analyses],
            "dry_run": dry_run,
        }

    async def _add_initial_steps(
        self,
        loop_run: TestFailureLoopRun,
        strategy: str,
        analyses: list[Any],
        context: dict[str, Any],
        request: FailureLoopStartRequest,
    ) -> None:
        plan = self._build_remediation_plan(strategy, analyses)
        verify = self._build_verification_plan(strategy, analyses, request)
        steps = [
            (
                "discover",
                "collect_failed_jobs_and_context",
                "Collected failed job evidence, logs, summaries, and existing reports.",
                {"context": context},
            ),
            (
                "plan",
                f"select_{strategy}_strategy",
                f"Selected {strategy} and generated remediation candidates.",
                {"remediation_plan": plan},
            ),
            (
                "execute",
                "prepare_remediation_actions",
                "Dry-run mode produced actionable fixes without mutating scripts.",
                {"dry_run": request.dry_run, "actions": plan},
            ),
            (
                "verify",
                "define_rerun_checks",
                "Prepared objective verification checks for the next execution pass.",
                {"verification_plan": verify},
            ),
            (
                "iterate",
                "evaluate_stop_condition",
                "Stopped after producing a safe remediation plan for human review or next automation stage.",
                {
                    "stop_condition": "dry_run_plan_ready" if request.dry_run else "automation_extension_required",
                    "max_iterations": request.max_iterations,
                },
            ),
        ]
        for index, (phase, action, summary, artifacts) in enumerate(steps, start=1):
            await self.loop_repo.add_step(
                {
                    "loop_run_id": loop_run.id,
                    "iteration": 1,
                    "step_order": index,
                    "phase": phase,
                    "status": "completed",
                    "action": action,
                    "input_snapshot": context if index == 1 else None,
                    "output_summary": summary,
                    "artifacts": artifacts,
                    "verification_result": artifacts if phase == "verify" else None,
                }
            )

    def _build_remediation_plan(self, strategy: str, analyses: Iterable[Any]) -> list[dict[str, Any]]:
        action_map = API_REMEDIATION_ACTIONS if strategy == "api_failure" else UI_REMEDIATION_ACTIONS
        plan = []
        for analysis in analyses:
            category = getattr(analysis, "failure_category", "unknown")
            recommendations = list(getattr(analysis, "recommendations", []) or [])
            actions = action_map.get(category, []) + recommendations
            plan.append(
                {
                    "job_id": str(getattr(analysis, "job_id")),
                    "category": category,
                    "severity": getattr(analysis, "severity", "medium"),
                    "confidence": getattr(analysis, "confidence", 0),
                    "auto_fixable": self._is_auto_fixable(strategy, category, getattr(analysis, "confidence", 0)),
                    "actions": actions[:6],
                }
            )
        return plan

    def _build_verification_plan(
        self,
        strategy: str,
        analyses: Iterable[Any],
        request: FailureLoopStartRequest,
    ) -> dict[str, Any]:
        return {
            "strategy": strategy,
            "checks": [
                "rerun_target_job",
                "compare_failure_signature",
                "stop_if_same_error_repeats",
                "stop_if_max_iterations_reached",
            ],
            "success_condition": "target job passes and failed count does not increase",
            "max_iterations": request.max_iterations,
            "dry_run": request.dry_run,
            "analysis_count": len(list(analyses)),
        }

    def _build_final_result(
        self,
        strategy: str,
        analyses: list[Any],
        request: FailureLoopStartRequest,
        repair_outcomes: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        plan = self._build_remediation_plan(strategy, analyses)
        auto_fixable = [item for item in plan if item["auto_fixable"]]
        repair_outcomes = repair_outcomes or []
        applied_count = sum(1 for item in repair_outcomes if item.get("status") == "applied")
        planned_count = sum(1 for item in repair_outcomes if item.get("status") == "planned")
        failed_count = sum(1 for item in repair_outcomes if item.get("status") == "failed")
        if request.dry_run:
            status = "needs_human_review"
            stop_reason = "dry_run_plan_ready"
        elif applied_count > 0 and failed_count == 0:
            status = "needs_human_review"
            stop_reason = "repair_applied_ready_for_verification"
        elif applied_count > 0:
            status = "needs_human_review"
            stop_reason = "repair_partially_applied"
        else:
            status = "blocked"
            stop_reason = "no_safe_auto_repair"
        return {
            "status": status,
            "stop_reason": stop_reason,
            "strategy": strategy,
            "auto_fixable_count": len(auto_fixable),
            "total_failures": len(plan),
            "remediation_plan": plan,
            "repair_outcomes": repair_outcomes,
            "repair_summary": {
                "applied": applied_count,
                "planned": planned_count,
                "failed": failed_count,
            },
        }

    def _is_auto_fixable(self, strategy: str, category: str, confidence: int) -> bool:
        api_fixable = {"assertion_mismatch", "test_data_issue", "test_script_error"}
        ui_fixable = {"ui_locator_issue", "timeout_or_flaky", "test_script_error", "assertion_mismatch"}
        allowed = api_fixable if strategy == "api_failure" else ui_fixable
        return category in allowed and int(confidence or 0) >= 60

    def _to_step_info(self, step: TestFailureLoopStep) -> FailureLoopStepInfo:
        return FailureLoopStepInfo(
            id=step.id,
            loop_run_id=step.loop_run_id,
            iteration=step.iteration,
            step_order=step.step_order,
            phase=step.phase,
            status=step.status,
            action=step.action,
            input_snapshot=step.input_snapshot,
            output_summary=step.output_summary,
            artifacts=step.artifacts,
            verification_result=step.verification_result,
            error_message=step.error_message,
            created_at=step.created_at,
            updated_at=step.updated_at,
        )

    def _to_run_info(self, loop_run: TestFailureLoopRun) -> FailureLoopRunInfo:
        steps = sorted(
            list(loop_run.steps or []),
            key=lambda item: (item.iteration, item.step_order),
        )
        return FailureLoopRunInfo(
            id=loop_run.id,
            project_id=loop_run.project_id,
            test_run_id=loop_run.test_run_id,
            job_id=loop_run.job_id,
            script_type=loop_run.script_type,
            strategy=loop_run.strategy,
            goal=loop_run.goal,
            status=loop_run.status,
            current_phase=loop_run.current_phase,
            current_iteration=loop_run.current_iteration,
            max_iterations=loop_run.max_iterations,
            stop_reason=loop_run.stop_reason,
            safety_flags=loop_run.safety_flags or [],
            context_snapshot=loop_run.context_snapshot,
            final_result=loop_run.final_result,
            steps=[self._to_step_info(step) for step in steps],
            created_at=loop_run.created_at,
            updated_at=loop_run.updated_at,
        )
