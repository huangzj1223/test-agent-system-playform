"""Repositories for persistent failure-loop state."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.loop import TestFailureLoopRun, TestFailureLoopStep


class TestFailureLoopRepository:
    """Data access for failure loop runs and steps."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_run(self, loop_run_id: UUID) -> Optional[TestFailureLoopRun]:
        stmt = (
            select(TestFailureLoopRun)
            .options(selectinload(TestFailureLoopRun.steps))
            .where(TestFailureLoopRun.id == loop_run_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_test_run(self, test_run_id: UUID) -> list[TestFailureLoopRun]:
        stmt = (
            select(TestFailureLoopRun)
            .options(selectinload(TestFailureLoopRun.steps))
            .where(TestFailureLoopRun.test_run_id == test_run_id)
            .order_by(TestFailureLoopRun.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_run(self, values: dict) -> TestFailureLoopRun:
        loop_run = TestFailureLoopRun(**values)
        self.session.add(loop_run)
        await self.session.flush()
        await self.session.refresh(loop_run)
        return loop_run

    async def update_run(self, loop_run: TestFailureLoopRun, values: dict) -> TestFailureLoopRun:
        for key, value in values.items():
            setattr(loop_run, key, value)
        await self.session.flush()
        await self.session.refresh(loop_run)
        return loop_run

    async def add_step(self, values: dict) -> TestFailureLoopStep:
        step = TestFailureLoopStep(**values)
        self.session.add(step)
        await self.session.flush()
        await self.session.refresh(step)
        return step
