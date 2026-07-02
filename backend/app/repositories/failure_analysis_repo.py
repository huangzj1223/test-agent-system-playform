"""Repository for automated test failure analyses."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.failure_analysis import TestFailureAnalysis


class FailureAnalysisRepository:
    """Data access for latest job-level failure analyses."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, analysis_id: UUID) -> Optional[TestFailureAnalysis]:
        stmt = select(TestFailureAnalysis).where(TestFailureAnalysis.id == analysis_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_job_id(self, job_id: UUID) -> Optional[TestFailureAnalysis]:
        stmt = select(TestFailureAnalysis).where(TestFailureAnalysis.job_id == job_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_test_run(self, test_run_id: UUID) -> list[TestFailureAnalysis]:
        stmt = (
            select(TestFailureAnalysis)
            .where(TestFailureAnalysis.test_run_id == test_run_id)
            .order_by(TestFailureAnalysis.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert_for_job(self, values: dict) -> TestFailureAnalysis:
        existing = await self.get_by_job_id(values["job_id"])
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.refresh(existing)
            return existing

        analysis = TestFailureAnalysis(**values)
        self.session.add(analysis)
        await self.session.flush()
        await self.session.refresh(analysis)
        return analysis
