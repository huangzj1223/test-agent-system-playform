"""Script repair helpers for failure-loop execution.

This service intentionally starts with conservative, auditable fixes. It only
mutates scripts when the failure evidence maps to a narrow rule and always
backs up the original MinIO object before overwriting it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.minio_client import MinIOClient
from app.models.api_test import APITest
from app.models.failure_analysis import TestFailureAnalysis
from app.models.test_run import TestRunScriptJob
from app.models.web_test import WebTest
from app.repositories.api_test_repo import APITestRepository
from app.repositories.web_test_repo import WebTestRepository
from app.schemas.enums import ScriptType


@dataclass
class RepairOutcome:
    job_id: str
    script_type: str
    script_id: str
    status: str
    category: str | None = None
    summary: str | None = None
    changed: bool = False
    script_path: str | None = None
    backup_path: str | None = None
    changes: list[dict[str, Any]] = field(default_factory=list)
    error_message: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "script_type": self.script_type,
            "script_id": self.script_id,
            "status": self.status,
            "category": self.category,
            "summary": self.summary,
            "changed": self.changed,
            "script_path": self.script_path,
            "backup_path": self.backup_path,
            "changes": self.changes,
            "error_message": self.error_message,
        }


class FailureLoopRepairService:
    """Apply conservative script repairs for API and UI failure loops."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.api_test_repo = APITestRepository(session)
        self.web_test_repo = WebTestRepository(session)

    async def repair_jobs(
        self,
        *,
        loop_run_id: UUID,
        jobs: list[TestRunScriptJob],
        analyses: list[Any],
        dry_run: bool,
    ) -> list[RepairOutcome]:
        analysis_by_job = {item.job_id: item for item in analyses}
        outcomes: list[RepairOutcome] = []
        for job in jobs:
            outcomes.append(
                await self.repair_job(
                    loop_run_id=loop_run_id,
                    job=job,
                    analysis=analysis_by_job.get(job.id),
                    dry_run=dry_run,
                )
            )
        return outcomes

    async def repair_job(
        self,
        *,
        loop_run_id: UUID,
        job: TestRunScriptJob,
        analysis: Any | None,
        dry_run: bool,
    ) -> RepairOutcome:
        category = analysis.failure_category if analysis else None
        outcome = RepairOutcome(
            job_id=str(job.id),
            script_type=job.script_type.value if job.script_type else "unknown",
            script_id=str(job.script_id),
            status="skipped",
            category=category,
        )

        if job.script_type not in {ScriptType.API_TEST, ScriptType.WEB_TEST}:
            outcome.summary = "Only API and Web/UI scripts are repairable in this loop stage."
            return outcome

        script_record = await self._get_script_record(job)
        if script_record is None:
            outcome.status = "failed"
            outcome.error_message = "Script record was not found."
            return outcome

        script_path = getattr(script_record, "script_path", None)
        outcome.script_path = script_path
        if not script_path:
            outcome.status = "failed"
            outcome.error_message = "Script path is empty."
            return outcome

        try:
            original = MinIOClient.download_file(script_path).decode("utf-8")
        except Exception as exc:  # pragma: no cover - depends on external MinIO
            outcome.status = "failed"
            outcome.error_message = f"Failed to download script: {exc}"
            return outcome

        fixed, changes = self._repair_content(job, analysis, original)
        outcome.changes = changes
        outcome.changed = fixed != original

        if not changes:
            outcome.status = "skipped"
            outcome.summary = "No safe automatic repair rule matched this failure."
            return outcome

        if dry_run:
            outcome.status = "planned"
            outcome.summary = "Repair plan generated; script was not modified because dry_run is enabled."
            return outcome

        if fixed == original:
            outcome.status = "skipped"
            outcome.summary = "Matched repair rule but content did not change."
            return outcome

        backup_path = self._backup_path(loop_run_id, script_path)
        try:
            MinIOClient.upload_bytes(
                object_name=backup_path,
                data=original.encode("utf-8"),
                content_type="text/plain",
            )
            MinIOClient.upload_bytes(
                object_name=script_path,
                data=fixed.encode("utf-8"),
                content_type="text/plain",
            )
        except Exception as exc:  # pragma: no cover - depends on external MinIO
            outcome.status = "failed"
            outcome.error_message = f"Failed to write repaired script: {exc}"
            return outcome

        outcome.status = "applied"
        outcome.backup_path = backup_path
        outcome.summary = "Script repair was applied and original content was backed up."
        return outcome

    async def _get_script_record(self, job: TestRunScriptJob) -> APITest | WebTest | None:
        if job.script_type == ScriptType.API_TEST:
            return await self.api_test_repo.get_by_id(job.script_id)
        if job.script_type == ScriptType.WEB_TEST:
            return await self.web_test_repo.get_by_id(job.script_id)
        return None

    def _repair_content(
        self,
        job: TestRunScriptJob,
        analysis: Any | None,
        content: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        category = analysis.failure_category if analysis else "unknown"
        if category == "assertion_mismatch":
            return self._repair_assertion_mismatch(job, content)
        if category == "timeout_or_flaky" and job.script_type == ScriptType.WEB_TEST:
            return self._repair_ui_timeout(content)
        if category == "test_script_error":
            return self._mark_unstable_script(
                content,
                "Loop Engineering marked this script for review after a script error.",
            )
        return content, []

    def _repair_assertion_mismatch(
        self,
        job: TestRunScriptJob,
        content: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        text = "\n".join(
            item for item in (job.error_message, job.stderr, job.stdout) if item
        )
        match = re.search(
            r"expected(?: status)?\s+(\d{3}).*?(?:received|got|actual)\s+(\d{3})",
            text,
            re.I | re.S,
        )
        if not match:
            match = re.search(r"expected\s+(\d{3})\s+received\s+(\d{3})", text, re.I)
        if not match:
            return content, []

        expected, received = match.group(1), match.group(2)
        replacements = [
            (f"toBe({expected})", f"toBe({received})"),
            (f"toEqual({expected})", f"toEqual({received})"),
            (f'toBe("{expected}")', f'toBe("{received}")'),
            (f'toEqual("{expected}")', f'toEqual("{received}")'),
            (f"toBe('{expected}')", f"toBe('{received}')"),
            (f"toEqual('{expected}')", f"toEqual('{received}')"),
        ]
        fixed = content
        changes: list[dict[str, Any]] = []
        for before, after in replacements:
            if before in fixed:
                fixed = fixed.replace(before, after, 1)
                changes.append(
                    {
                        "type": "status_assertion_update",
                        "before": before,
                        "after": after,
                        "reason": (
                            f"Failure evidence shows actual status {received} "
                            f"while script expected {expected}."
                        ),
                    }
                )
                break
        return fixed, changes

    def _repair_ui_timeout(self, content: str) -> tuple[str, list[dict[str, Any]]]:
        pattern = re.compile(r"await\s+page\.waitForTimeout\((\d+)\);?")
        match = pattern.search(content)
        if not match:
            return content, []
        replacement = "await page.waitForLoadState('networkidle');"
        fixed = pattern.sub(replacement, content, count=1)
        return fixed, [
            {
                "type": "replace_fixed_wait",
                "before": match.group(0),
                "after": replacement,
                "reason": (
                    "Timeout/flaky UI failure: replace one fixed wait with a "
                    "deterministic load-state wait."
                ),
            }
        ]

    def _mark_unstable_script(
        self,
        content: str,
        reason: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        if "Loop Engineering marked this script" in content:
            return content, []
        marker = f"// {reason}\n"
        return marker + content, [
            {
                "type": "review_marker",
                "before": "<file-start>",
                "after": marker.strip(),
                "reason": "Script error category requires human-readable marker before deeper rewrite.",
            }
        ]

    def _backup_path(self, loop_run_id: UUID, script_path: str) -> str:
        name = PurePosixPath(script_path).name or "script.txt"
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        return f"failure-loop-backups/{loop_run_id}/{stamp}-{name}"
