"""Agent skill registry model."""

from uuid import UUID

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class AgentSkill(Base, UUIDMixin, TimestampMixin):
    """Registered high-level agent skill."""

    __tablename__ = "agent_skills"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    entrypoint: Mapped[str] = mapped_column(String(200), nullable=False)
    keywords: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
