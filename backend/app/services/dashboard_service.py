"""Aggregate real platform data for the system quality command center."""

from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_test import APITest
from app.models.failure_analysis import TestFailureAnalysis
from app.models.loop import TestFailureLoopRun
from app.models.project import Project
from app.models.test_case import TestCase
from app.models.test_run import TestRun, TestRunScriptJob
from app.models.test_scenario import TestScenario
from app.models.web_test import WebTest
from app.schemas.dashboard import (
    DashboardActivity,
    DashboardAgentStage,
    DashboardLoopEfficiency,
    DashboardMetrics,
    DashboardOverview,
    DashboardProjectSituation,
    DashboardRiskItem,
    DashboardWorkItem,
)
from app.schemas.enums import JobStatus


def calculate_pass_rate(*, passed: int, failed: int, blocked: int) -> int | None:
    """Calculate a rate only from results that reached an executed state."""
    executed = passed + failed + blocked
    return round(passed / executed * 100) if executed else None


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _count(self, statement) -> int:
        return int((await self.db.execute(statement)).scalar_one() or 0)

    async def get_overview(self) -> DashboardOverview:
        projects = await self._project_situations()
        return DashboardOverview(
            updated_at=datetime.now(timezone.utc),
            metrics=await self._metrics(projects),
            agent_stages=await self._agent_stages(),
            risk_items=await self._risk_items(),
            projects=projects,
            work_items=await self._work_items(),
            recent_activities=await self._recent_activities(),
            loop_efficiency=await self._loop_efficiency(),
        )

    async def _project_situations(self) -> list[DashboardProjectSituation]:
        test_case_count = self._project_count(TestCase)
        api_test_count = self._project_count(APITest)
        web_test_count = self._project_count(WebTest)
        scenario_count = self._project_count(TestScenario)
        run_count = self._project_count(TestRun)
        running_jobs = (
            select(func.count(TestRunScriptJob.id))
            .join(TestRun, TestRun.id == TestRunScriptJob.test_run_id)
            .where(
                TestRun.project_id == Project.id,
                TestRunScriptJob.status.in_([JobStatus.PENDING, JobStatus.RUNNING]),
            )
            .correlate(Project)
            .scalar_subquery()
        )
        passed = self._project_run_sum(TestRun.passed_count)
        failed = self._project_run_sum(TestRun.failed_count)
        blocked = self._project_run_sum(TestRun.blocked_count)
        last_activity = (
            select(func.max(TestRun.updated_at))
            .where(TestRun.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
        )
        statement = select(
            Project.identifier,
            Project.name,
            Project.description,
            test_case_count.label("test_cases"),
            (api_test_count + web_test_count + scenario_count).label("test_scripts"),
            run_count.label("test_runs"),
            running_jobs.label("running_tasks"),
            passed.label("passed"),
            failed.label("failed"),
            blocked.label("blocked"),
            last_activity.label("last_activity_at"),
        ).order_by((failed + blocked).desc(), last_activity.desc().nullslast())

        rows = (await self.db.execute(statement)).mappings().all()
        situations: list[DashboardProjectSituation] = []
        for row in rows:
            failed_total = int(row["failed"] or 0)
            blocked_total = int(row["blocked"] or 0)
            passed_total = int(row["passed"] or 0)
            run_total = int(row["test_runs"] or 0)
            if blocked_total > 0 or failed_total >= 10:
                risk_level = "blocked"
            elif failed_total > 0:
                risk_level = "attention"
            elif run_total > 0:
                risk_level = "healthy"
            else:
                risk_level = "no_data"
            situations.append(
                DashboardProjectSituation(
                    identifier=row["identifier"],
                    name=row["name"],
                    description=row["description"],
                    test_cases=int(row["test_cases"] or 0),
                    test_scripts=int(row["test_scripts"] or 0),
                    test_runs=run_total,
                    running_tasks=int(row["running_tasks"] or 0),
                    passed=passed_total,
                    failed=failed_total,
                    blocked=blocked_total,
                    pass_rate=calculate_pass_rate(
                        passed=passed_total,
                        failed=failed_total,
                        blocked=blocked_total,
                    ),
                    risk_level=risk_level,
                    last_activity_at=row["last_activity_at"],
                )
            )
        return situations

    @staticmethod
    def _project_count(model):
        return (
            select(func.count(model.id))
            .where(model.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
        )

    @staticmethod
    def _project_run_sum(column):
        return (
            select(func.coalesce(func.sum(column), 0))
            .where(TestRun.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
        )

    async def _metrics(
        self, projects: list[DashboardProjectSituation]
    ) -> DashboardMetrics:
        running_tasks = await self._count(
            select(func.count(TestRunScriptJob.id)).where(
                TestRunScriptJob.status.in_([JobStatus.PENDING, JobStatus.RUNNING])
            )
        )
        failed_jobs = await self._count(
            select(func.count(TestRunScriptJob.id)).where(
                TestRunScriptJob.status == JobStatus.FAILED
            )
        )
        review_loops = await self._count(
            select(func.count(TestFailureLoopRun.id)).where(
                TestFailureLoopRun.status.in_(["needs_human_review", "blocked"])
            )
        )
        passed = sum(project.passed for project in projects)
        failed = sum(project.failed for project in projects)
        blocked = sum(project.blocked for project in projects)
        return DashboardMetrics(
            active_projects=sum(
                1
                for project in projects
                if project.test_cases + project.test_scripts + project.test_runs > 0
            ),
            total_projects=len(projects),
            test_assets=sum(
                project.test_cases + project.test_scripts for project in projects
            ),
            running_tasks=running_tasks,
            manual_actions=failed_jobs + review_loops,
            pass_rate=calculate_pass_rate(
                passed=passed, failed=failed, blocked=blocked
            ),
        )

    async def _agent_stages(self) -> list[DashboardAgentStage]:
        total_cases = await self._count(select(func.count(TestCase.id)))
        generated_scripts = sum(
            [
                await self._count(select(func.count(APITest.id))),
                await self._count(select(func.count(WebTest.id))),
                await self._count(select(func.count(TestScenario.id))),
            ]
        )
        running_jobs = await self._count(
            select(func.count(TestRunScriptJob.id)).where(
                TestRunScriptJob.status == JobStatus.RUNNING
            )
        )
        failed_jobs = await self._count(
            select(func.count(TestRunScriptJob.id)).where(
                TestRunScriptJob.status == JobStatus.FAILED
            )
        )
        analyses = await self._count(
            select(func.count(TestFailureAnalysis.id)).where(
                TestFailureAnalysis.analysis_status == "completed"
            )
        )
        active_loops = await self._count(
            select(func.count(TestFailureLoopRun.id)).where(
                TestFailureLoopRun.status == "running"
            )
        )
        completed_loops = await self._count(
            select(func.count(TestFailureLoopRun.id)).where(
                TestFailureLoopRun.status == "completed"
            )
        )
        return [
            self._stage(
                "requirements", "需求解析", "需求任务尚未接入统一运行记录",
                "unavailable", None, data_available=False,
            ),
            self._stage(
                "design", "测试设计", "已沉淀的标准测试用例",
                "ready" if total_cases else "idle", total_cases,
            ),
            self._stage(
                "generation", "脚本生成", "API、场景和 Web 自动化脚本",
                "ready" if generated_scripts else "idle", generated_scripts,
            ),
            self._stage(
                "execution", "自动执行", "当前正在运行的测试作业",
                "running" if running_jobs else "idle", running_jobs, failed_jobs,
            ),
            self._stage(
                "analysis", "结果分析", "已完成的失败原因分析",
                "attention" if failed_jobs else ("ready" if analyses else "idle"),
                analyses, failed_jobs,
            ),
            self._stage(
                "repair", "失败修复", "自动分析与修复闭环",
                "running" if active_loops else "idle", active_loops,
            ),
            self._stage(
                "verification", "回归验证", "已经完成并通过验证的闭环",
                "ready" if completed_loops else "idle", completed_loops,
            ),
        ]

    @staticmethod
    def _stage(
        key: str,
        name: str,
        description: str,
        status: str,
        task_count: int | None,
        issue_count: int = 0,
        *,
        data_available: bool = True,
    ) -> DashboardAgentStage:
        return DashboardAgentStage(
            key=key,
            name=name,
            description=description,
            status=status,
            task_count=task_count,
            issue_count=issue_count,
            href="/projects" if data_available else None,
            data_available=data_available,
        )

    async def _risk_items(self) -> list[DashboardRiskItem]:
        statement = (
            select(TestFailureAnalysis, Project, TestRun)
            .join(Project, Project.id == TestFailureAnalysis.project_id)
            .join(TestRun, TestRun.id == TestFailureAnalysis.test_run_id)
            .where(TestFailureAnalysis.analysis_status == "completed")
            .order_by(
                case(
                    (TestFailureAnalysis.severity == "critical", 0),
                    (TestFailureAnalysis.severity == "high", 1),
                    (TestFailureAnalysis.severity == "medium", 2),
                    else_=3,
                ),
                TestFailureAnalysis.created_at.desc(),
            )
            .limit(6)
        )
        rows = (await self.db.execute(statement)).all()
        items: list[DashboardRiskItem] = []
        for analysis, project, test_run in rows:
            severity = analysis.severity
            if severity not in {"critical", "high", "medium", "low"}:
                severity = "medium"
            items.append(
                DashboardRiskItem(
                    id=str(analysis.id),
                    severity=severity,
                    title=analysis.summary,
                    reason=analysis.root_cause or "失败原因已记录，等待进一步确认",
                    project_identifier=project.identifier,
                    project_name=project.name,
                    confidence=analysis.confidence,
                    href=f"/projects/{project.identifier}/test-runs/{test_run.identifier}",
                    created_at=analysis.created_at,
                )
            )
        return items

    async def _work_items(self) -> list[DashboardWorkItem]:
        statement = (
            select(TestFailureLoopRun, Project, TestRun)
            .join(Project, Project.id == TestFailureLoopRun.project_id)
            .join(TestRun, TestRun.id == TestFailureLoopRun.test_run_id)
            .where(
                TestFailureLoopRun.status.in_(
                    ["running", "needs_human_review", "blocked"]
                )
            )
            .order_by(TestFailureLoopRun.updated_at.desc())
            .limit(10)
        )
        rows = (await self.db.execute(statement)).all()
        items: list[DashboardWorkItem] = []
        for loop, project, test_run in rows:
            if loop.status == "needs_human_review":
                group, title = "review", "修复结果等待审核"
            elif loop.status == "blocked":
                group, title = "handle", "测试闭环被阻塞"
            else:
                group, title = "watch", "自动修复闭环运行中"
            items.append(
                DashboardWorkItem(
                    id=str(loop.id),
                    group=group,
                    title=title,
                    description=f"{loop.goal} · 当前阶段：{loop.current_phase}",
                    project_identifier=project.identifier,
                    project_name=project.name,
                    href=f"/projects/{project.identifier}/test-runs/{test_run.identifier}",
                    created_at=loop.created_at,
                )
            )
        return items

    async def _recent_activities(self) -> list[DashboardActivity]:
        statement = (
            select(TestRun, Project)
            .join(Project, Project.id == TestRun.project_id)
            .order_by(TestRun.updated_at.desc())
            .limit(8)
        )
        rows = (await self.db.execute(statement)).all()
        return [
            DashboardActivity(
                id=str(test_run.id),
                event_type="run",
                title=test_run.name,
                description=f"通过 {test_run.passed_count} · 失败 {test_run.failed_count}",
                project_identifier=project.identifier,
                project_name=project.name,
                href=f"/projects/{project.identifier}/test-runs/{test_run.identifier}",
                occurred_at=test_run.updated_at or test_run.created_at,
            )
            for test_run, project in rows
        ]

    async def _loop_efficiency(self) -> DashboardLoopEfficiency:
        grouped = (
            await self.db.execute(
                select(TestFailureLoopRun.status, func.count(TestFailureLoopRun.id))
                .group_by(TestFailureLoopRun.status)
            )
        ).all()
        counts = {status: int(count) for status, count in grouped}
        completed = counts.get("completed", 0)
        review = counts.get("needs_human_review", 0)
        blocked = counts.get("blocked", 0)
        terminal = completed + review + blocked
        return DashboardLoopEfficiency(
            tracked_loops=sum(counts.values()),
            active_loops=counts.get("running", 0),
            completed_loops=completed,
            needs_human_review=review + blocked,
            average_diagnosis_minutes=None,
            auto_fix_rate=round(completed / terminal * 100) if terminal else None,
            verification_pass_rate=None,
        )
