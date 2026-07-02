"""Persistent loop state for automated failure handling."""

from sqlalchemy import ForeignKey, Integer, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.schemas.enums import ScriptType


class TestFailureLoopRun(Base, UUIDMixin, TimestampMixin):
    """Top-level closed-loop run for a failed test job or run."""

    __tablename__ = "test_failure_loop_runs"
    __table_args__ = {"comment": "Automated test failure loop run"}

    project_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    test_run_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_run_script_jobs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    script_type: Mapped[ScriptType | None] = mapped_column(
        SQLEnum(ScriptType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=True,
        index=True,
    )
    strategy: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30),
        default="running",
        nullable=False,
        index=True,
    )
    current_phase: Mapped[str] = mapped_column(
        String(40),
        default="discover",
        nullable=False,
        index=True,
    )
    current_iteration: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_iterations: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    stop_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    context_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    final_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    steps: Mapped[list["TestFailureLoopStep"]] = relationship(
        "TestFailureLoopStep",
        back_populates="loop_run",
        cascade="all, delete-orphan",
        order_by="TestFailureLoopStep.iteration, TestFailureLoopStep.step_order",
    )


class TestFailureLoopStep(Base, UUIDMixin, TimestampMixin):
    """Single Discover/Plan/Execute/Verify/Iterate step within a loop run."""

    __tablename__ = "test_failure_loop_steps"
    __table_args__ = {"comment": "Automated test failure loop step"}

    loop_run_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_failure_loop_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    iteration: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    phase: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="completed", nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    input_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifacts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    verification_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    loop_run: Mapped[TestFailureLoopRun] = relationship(
        "TestFailureLoopRun",
        back_populates="steps",
    )
