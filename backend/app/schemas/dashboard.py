"""Read-only system overview schemas for the quality command center."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    active_projects: int = 0
    total_projects: int = 0
    test_assets: int = 0
    running_tasks: int = 0
    manual_actions: int = 0
    pass_rate: int | None = None


class DashboardAgentStage(BaseModel):
    key: str
    name: str
    description: str
    status: Literal["running", "attention", "ready", "idle", "unavailable"]
    task_count: int | None = None
    issue_count: int = 0
    href: str | None = None
    data_available: bool = True


class DashboardRiskItem(BaseModel):
    id: str
    severity: Literal["critical", "high", "medium", "low"]
    title: str
    reason: str
    project_identifier: str
    project_name: str
    confidence: int | None = None
    href: str
    created_at: datetime


class DashboardProjectSituation(BaseModel):
    identifier: str
    name: str
    description: str | None = None
    test_cases: int = 0
    test_scripts: int = 0
    test_runs: int = 0
    running_tasks: int = 0
    passed: int = 0
    failed: int = 0
    blocked: int = 0
    pass_rate: int | None = None
    risk_level: Literal["blocked", "attention", "healthy", "no_data"]
    last_activity_at: datetime | None = None


class DashboardWorkItem(BaseModel):
    id: str
    group: Literal["review", "handle", "watch"]
    title: str
    description: str
    project_identifier: str
    project_name: str
    href: str
    created_at: datetime


class DashboardActivity(BaseModel):
    id: str
    event_type: Literal["run", "analysis", "loop"]
    title: str
    description: str
    project_identifier: str
    project_name: str
    href: str
    occurred_at: datetime


class DashboardLoopEfficiency(BaseModel):
    tracked_loops: int = 0
    active_loops: int = 0
    completed_loops: int = 0
    needs_human_review: int = 0
    average_diagnosis_minutes: int | None = None
    auto_fix_rate: int | None = None
    verification_pass_rate: int | None = None


class DashboardOverview(BaseModel):
    updated_at: datetime
    metrics: DashboardMetrics
    agent_stages: list[DashboardAgentStage] = Field(default_factory=list)
    risk_items: list[DashboardRiskItem] = Field(default_factory=list)
    projects: list[DashboardProjectSituation] = Field(default_factory=list)
    work_items: list[DashboardWorkItem] = Field(default_factory=list)
    recent_activities: list[DashboardActivity] = Field(default_factory=list)
    loop_efficiency: DashboardLoopEfficiency
