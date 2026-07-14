import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.services.project_service import (
    ProjectDeletionInventory,
    ProjectService,
    normalize_storage_object_name,
)
from app.config.settings import settings
from app.utils.exceptions import BadRequestException


class ProjectDeletionServiceTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.session = AsyncMock()
        self.service = ProjectService(self.session)
        self.service.repo = AsyncMock()
        self.project = SimpleNamespace(id=uuid4(), identifier="PR-9", name="待删除项目")
        self.service.repo.get_by_identifier.return_value = self.project
        self.inventory = ProjectDeletionInventory(
            counts={"test_cases": 3, "api_tests": 2, "attachments": 1},
            object_names=["projects/PR-9/report.zip"],
        )
        self.service._get_deletion_inventory = AsyncMock(return_value=self.inventory)

    async def test_confirmation_must_match_project_name(self) -> None:
        with self.assertRaises(BadRequestException):
            await self.service.delete_project("PR-9", confirmation="错误名称")

        self.service.repo.delete.assert_not_awaited()
        self.service._get_deletion_inventory.assert_not_awaited()

    async def test_minio_failure_keeps_database_project(self) -> None:
        with patch(
            "app.services.project_service.MinIOClient.delete_files",
            side_effect=RuntimeError("MinIO unavailable"),
        ):
            with self.assertRaisesRegex(RuntimeError, "MinIO unavailable"):
                await self.service.delete_project("PR-9", confirmation="待删除项目")

        self.service.repo.delete.assert_not_awaited()

    async def test_success_returns_deletion_counts(self) -> None:
        with patch("app.services.project_service.MinIOClient.delete_files") as delete_files:
            result = await self.service.delete_project("PR-9", confirmation="待删除项目")

        delete_files.assert_called_once_with(["projects/PR-9/report.zip"])
        self.service.repo.delete.assert_awaited_once_with(self.project)
        self.assertEqual(result.deleted_records, 6)
        self.assertEqual(result.deleted_objects, 1)


class StorageObjectNormalizationTest(unittest.TestCase):
    def test_normalizes_minio_urls_and_ignores_local_absolute_paths(self) -> None:
        self.assertEqual(
            normalize_storage_object_name(
                f"http://localhost:9000/{settings.minio_bucket}/playwright-reports/run-1/report.zip"
            ),
            "playwright-reports/run-1/report.zip",
        )
        self.assertEqual(
            normalize_storage_object_name("api-scripts/PR-1/login.spec.ts"),
            "api-scripts/PR-1/login.spec.ts",
        )
        self.assertIsNone(normalize_storage_object_name("D:\\workspace\\report.zip"))
        self.assertIsNone(normalize_storage_object_name("/tmp/report.zip"))


if __name__ == "__main__":
    unittest.main()
