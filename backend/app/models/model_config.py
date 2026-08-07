"""Model provider and model configuration tables."""

from uuid import UUID as UUIDType

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ModelProvider(Base, UUIDMixin, TimestampMixin):
    """LLM provider connection configuration."""

    __tablename__ = "model_providers"
    __table_args__ = {"comment": "Model provider configuration"}

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Name")
    provider: Mapped[str] = mapped_column(String(50), nullable=False, comment="Provider type")
    api_endpoint: Mapped[str] = mapped_column(String(500), nullable=False, comment="API endpoint")
    api_key_cipher: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Encrypted API key")
    protocol_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="Protocol type")
    api_version: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="API version")
    remark: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="Remark")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="Enabled")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="Sort order")

    models: Mapped[list["ModelConfig"]] = relationship(
        "ModelConfig",
        back_populates="provider",
        cascade="all, delete-orphan",
    )


class ModelConfig(Base, UUIDMixin, TimestampMixin):
    """LLM model metadata under a provider."""

    __tablename__ = "model_configs"
    __table_args__ = (
        UniqueConstraint("provider_id", "model_id", name="uq_model_provider_model_id"),
        {"comment": "Model configuration"},
    )

    provider_id: Mapped[UUIDType] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("model_providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Provider ID",
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Display name")
    model_id: Mapped[str] = mapped_column(String(100), nullable=False, comment="Provider model ID")
    context_window: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Context window")
    max_output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Max output tokens")
    pool_group: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Pool group")
    default_temperature: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Default temperature")
    default_top_p: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Default top_p")
    timeout_sec: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Timeout seconds")
    retry_count: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Retry count")
    support_text: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="Supports text")
    support_image_input: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="Supports image input")
    support_image_output: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="Supports image output")
    support_tools: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="Supports tools")
    support_stream: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="Supports stream")
    support_code: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="Supports code")
    support_long_text: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="Supports long text")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="Enabled")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="Sort order")

    provider: Mapped[ModelProvider] = relationship("ModelProvider", back_populates="models")
