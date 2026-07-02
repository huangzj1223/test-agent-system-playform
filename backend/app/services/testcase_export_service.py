"""
测试用例导出服务

提供测试用例导出为 Excel/Word/JSON 的统一服务
"""

import io
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional, Tuple
from uuid import UUID, uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.testcase.excel_exporter import export_test_cases_to_excel
from app.agents.testcase.json_exporter import export_test_cases_to_json
from app.schemas.enums import ExportStatus
from app.utils.exceptions import NotFoundException, BadRequestException
from app.config.settings import settings


ExportFormat = Literal["excel", "word", "json"]


class TestCaseExportService:
    """
    测试用例导出服务

    提供测试用例导出为 Excel/Word/JSON 的功能，支持异步处理和进度追踪
    """

    COLLECTION_NAME = "testcase_export_jobs"
    EXPORTS_DIR = Path(__file__).resolve().parents[2] / "exports"
    _memory_jobs: dict[str, dict] = {}

    def __init__(self, db: AsyncSession, mongodb: AsyncIOMotorDatabase | None):
        self.db = db
        self.mongodb = mongodb

    async def _insert_job(self, job: dict) -> None:
        if self.mongodb is None:
            self._memory_jobs[job["_id"]] = job
            return
        await self.mongodb[self.COLLECTION_NAME].insert_one(job)

    async def _find_job(self, export_id: str) -> Optional[dict]:
        if self.mongodb is None:
            return self._memory_jobs.get(export_id)
        return await self.mongodb[self.COLLECTION_NAME].find_one({"_id": export_id})

    async def _update_job(self, export_id: str, values: dict) -> None:
        if self.mongodb is None:
            job = self._memory_jobs.get(export_id)
            if job is not None:
                job.update(values)
            return
        await self.mongodb[self.COLLECTION_NAME].update_one(
            {"_id": export_id},
            {"$set": values},
        )

    async def start_export(
        self,
        project_id: UUID,
        test_case_ids: list[str],
        format: ExportFormat,
        include_attachments: bool = False,
        template: str = "default",
    ) -> dict:
        """
        启动测试用例导出任务

        Args:
            project_id: 项目 ID
            test_case_ids: 测试用例标识符列表
            format: 导出格式（excel/word/json）
            include_attachments: 是否包含附件
            template: 导出模板名称

        Returns:
            dict: 导出任务信息 {export_id, status, status_url}
        """
        export_id = str(uuid4())

        # 创建导出任务记录
        export_job = {
            "_id": export_id,
            "project_id": str(project_id),
            "test_case_ids": test_case_ids,
            "format": format,
            "include_attachments": include_attachments,
            "template": template,
            "status": ExportStatus.PENDING.value,
            "download_url": None,
            "file_path": None,
            "filename": None,
            "content_type": None,
            "error_message": None,
            "created_at": datetime.utcnow(),
            "completed_at": None,
        }

        await self._insert_job(export_job)

        # 同步处理导出任务（简化实现，生产环境应使用 Celery 等异步任务队列）
        await self._process_export(export_id)
        export_job = await self._find_job(export_id) or {}

        status_url = f"{settings.api_prefix}/testcase-exports/{export_id}/status"

        return {
            "export_id": export_id,
            "status": export_job.get("status", ExportStatus.PENDING.value),
            "status_url": status_url,
        }

    async def _process_export(self, export_id: str) -> None:
        """
        处理导出任务

        Args:
            export_id: 导出任务 ID
        """
        try:
            # 更新状态为处理中
            await self._update_job(export_id, {"status": ExportStatus.PROCESSING.value})

            # 获取导出任务信息
            job = await self._find_job(export_id)
            if not job:
                return

            # 查询测试用例数据
            test_cases_data = await self._fetch_test_cases(
                job["project_id"],
                job["test_case_ids"]
            )

            if not test_cases_data:
                raise BadRequestException("未找到指定的测试用例")

            # 根据格式调用对应的导出器
            file_path, filename, content_type = await self._export_by_format(
                test_cases_data,
                job["format"],
                export_id,
            )

            download_url = f"{settings.api_prefix}/testcase-exports/{export_id}/download"

            # 更新任务状态为完成
            await self._update_job(export_id, {"status": ExportStatus.COMPLETED.value, "download_url": download_url, "file_path": str(file_path), "filename": filename, "content_type": content_type, "completed_at": datetime.utcnow()})

        except Exception as e:
            # 更新任务状态为失败
            await self._update_job(export_id, {"status": ExportStatus.FAILED.value, "error_message": str(e), "completed_at": datetime.utcnow()})

    async def _fetch_test_cases(
        self,
        project_id: str,
        test_case_ids: list[str]
    ) -> list[dict]:
        """Fetch test cases and convert them to exporter input format."""
        from app.repositories.test_case_repo import TestCaseRepository

        repo = TestCaseRepository(self.db)
        test_cases: list[dict] = []

        if test_case_ids:
            source_cases = []
            for tc_id in test_case_ids:
                tc = await repo.get_by_identifier(tc_id)
                if tc and str(tc.project_id) == project_id:
                    source_cases.append(tc)
        else:
            source_cases = await repo.get_by_project(UUID(project_id), offset=0, limit=10000)

        for tc in source_cases:
            if str(tc.project_id) != project_id:
                continue

            test_case_dict = {
                "id": tc.identifier,
                "title": tc.name,
                "name": tc.name,
                "module": tc.folder.name if tc.folder else "未分类",
                "type": tc.test_case_type.value if tc.test_case_type else "functional",
                "case_type": tc.test_case_type.value if tc.test_case_type else "functional",
                "priority": tc.priority.value if tc.priority else "medium",
                "preconditions": tc.preconditions or "",
                "remarks": tc.description or "",
                "steps": [],
                "expected_results": [],
            }

            if tc.steps:
                for step in sorted(tc.steps, key=lambda s: s.step_number):
                    test_case_dict["steps"].append({
                        "seq": step.step_number,
                        "action": step.action,
                        "step": step.step_number,
                        "操作描述": step.action,
                    })
                    if step.expected_result:
                        test_case_dict["expected_results"].append(step.expected_result)

            if tc.template and tc.template.value == "test_case_bdd":
                test_case_dict["feature"] = tc.feature
                test_case_dict["scenario"] = tc.scenario
                test_case_dict["background"] = tc.background

            test_cases.append(test_case_dict)

        return test_cases

    async def _export_by_format(
        self,
        test_cases: list[dict],
        format: str,
        export_id: str,
    ) -> Tuple[Path, str, str]:
        """
        根据格式调用对应的导出器

        Args:
            test_cases: 测试用例字典列表
            format: 导出格式
            export_id: 导出任务 ID

        Returns:
            Tuple[Path, str, str]: (文件路径, 文件名, 内容类型)
        """
        self.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "excel":
            filename = f"测试用例_{timestamp}.xlsx"
            file_path = self.EXPORTS_DIR / filename
            export_test_cases_to_excel(test_cases, str(file_path))
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        elif format == "word":
            from app.agents.testcase.docx_exporter import export_test_cases_to_docx

            filename = f"测试用例_{timestamp}.docx"
            file_path = self.EXPORTS_DIR / filename
            export_test_cases_to_docx(test_cases, str(file_path))
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        elif format == "json":
            filename = f"测试用例_{timestamp}.json"
            file_path = self.EXPORTS_DIR / filename
            export_test_cases_to_json(test_cases, str(file_path))
            content_type = "application/json"

        else:
            raise BadRequestException(f"不支持的导出格式: {format}")

        return Path(file_path), filename, content_type

    async def get_export_status(self, export_id: str) -> dict:
        """
        获取导出任务状态

        Args:
            export_id: 导出任务 ID

        Returns:
            dict: 导出状态信息
        """
        job = await self._find_job(export_id)
        if not job:
            raise NotFoundException(f"导出任务 {export_id} 不存在")

        return {
            "export_id": export_id,
            "status": job["status"],
            "download_url": job.get("download_url"),
            "error_message": job.get("error_message"),
            "created_at": job["created_at"],
            "completed_at": job.get("completed_at"),
        }

    async def download_export(
        self,
        export_id: str
    ) -> Tuple[bytes, str, str]:
        """
        下载导出文件

        Args:
            export_id: 导出任务 ID

        Returns:
            Tuple[bytes, str, str]: (文件内容, 文件名, 内容类型)
        """
        job = await self._find_job(export_id)
        if not job:
            raise NotFoundException(f"导出任务 {export_id} 不存在")

        if job["status"] != ExportStatus.COMPLETED.value:
            raise BadRequestException(f"导出任务尚未完成，当前状态: {job['status']}")

        file_path = Path(job["file_path"])
        if not file_path.exists():
            raise NotFoundException(f"导出文件不存在: {file_path}")

        with open(file_path, "rb") as f:
            file_content = f.read()

        return (
            file_content,
            job["filename"],
            job["content_type"]
        )
