"""Schemas for automated failure loop runs."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.enums import ScriptType
from app.schemas.test_run import FailureAnalysisInfo


class FailureLoopStartRequest(BaseModel):
    """Start a closed-loop failure analysis/remediation run."""

    job_id: Optional[str] = Field(default=None, description="Optional failed script job id")
    strategy: Optional[str] = Field(default=None, description="api_failure or ui_failure")
    max_iterations: int = Field(default=3, ge=1, le=10, description="Maximum loop iterations")
    force_analysis: bool = Field(default=False, description="Refresh failure analysis first")
    dry_run: bool = Field(default=True, description="Only produce remediation plan in this version")


class FailureLoopStepInfo(BaseModel):
    """Single loop step."""

    id: UUID
    loop_run_id: UUID
    iteration: int
    step_order: int
    phase: str
    status: str
    action: str
    input_snapshot: Optional[dict[str, Any]] = None
    output_summary: Optional[str] = None
    artifacts: Optional[dict[str, Any]] = None
    verification_result: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class FailureLoopRunInfo(BaseModel):
    """Persistent failure-loop run."""

    id: UUID
    project_id: UUID
    test_run_id: UUID
    job_id: Optional[UUID] = None
    script_type: Optional[ScriptType] = None
    strategy: str
    goal: str
    status: str
    current_phase: str
    current_iteration: int
    max_iterations: int
    stop_reason: Optional[str] = None
    safety_flags: list[dict[str, Any]] = Field(default_factory=list)
    context_snapshot: Optional[dict[str, Any]] = None
    final_result: Optional[dict[str, Any]] = None
    steps: list[FailureLoopStepInfo] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


class FailureLoopStartResult(BaseModel):
    """Start response containing loop state and generated analyses."""

    loop_run: FailureLoopRunInfo
    analyses: list[FailureAnalysisInfo] = Field(default_factory=list)
