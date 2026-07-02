"""Failure analysis models for automated test runs."""

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.schemas.enums import ScriptType


class TestFailureAnalysis(Base, UUIDMixin, TimestampMixin):
    """Latest AI-assisted failure analysis for a script job."""

    __tablename__ = "test_failure_analyses"
    __table_args__ = (
        UniqueConstraint("job_id", name="uq_test_failure_analyses_job_id"),
        {"comment": "自动化测试失败分析表"},
    )

    project_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="项目 ID",
    )
    test_run_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="测试运行 ID",
    )
    job_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_run_script_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="脚本作业 ID",
    )
    script_type: Mapped[ScriptType] = mapped_column(
        SQLEnum(ScriptType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        index=True,
        comment="脚本类型",
    )
    analysis_status: Mapped[str] = mapped_column(
        String(30),
        default="completed",
        nullable=False,
        index=True,
        comment="分析状态: completed / failed",
    )
    failure_category: Mapped[str] = mapped_column(
        String(80),
        default="unknown",
        nullable=False,
        index=True,
        comment="失败归因分类",
    )
    severity: Mapped[str] = mapped_column(
        String(30),
        default="medium",
        nullable=False,
        comment="严重程度: critical / high / medium / low",
    )
    confidence: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="置信度 0-100",
    )
    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="失败摘要",
    )
    root_cause: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="根因分析",
    )
    evidence: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
        comment="证据列表",
    )
    recommendations: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
        comment="建议动作",
    )
    knowledge_refs: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
        comment="知识库召回引用，Phase 1 默认为空",
    )
    raw_context: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="分析时使用的裁剪上下文",
    )
    model_name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        comment="使用的模型名称",
    )
    analysis_source: Mapped[str] = mapped_column(
        String(40),
        default="heuristic",
        nullable=False,
        comment="分析来源: llm / heuristic",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="分析过程错误",
    )
