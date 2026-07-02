"""
测试用例导出 API

提供测试用例导出为 Excel/Word/JSON 的接口
"""

from urllib.parse import quote

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.deps import DbSessionDep, CurrentUserIdDep
from app.services.testcase_export_service import TestCaseExportService
from app.schemas.testcase_export import (
    TestCaseExportRequest,
    TestCaseExportResponse,
    TestCaseExportStatusResponse,
)
from app.repositories.project_repo import ProjectRepository
from app.utils.exceptions import NotFoundException
from app.config.database import get_mongodb


router = APIRouter(prefix="/projects/{project_identifier}")


@router.post(
    "/test-cases/export",
    response_model=TestCaseExportResponse,
    summary="导出测试用例",
    description="启动测试用例导出任务，支持 Excel、Word、JSON 格式",
)
async def export_test_cases(
    project_identifier: str,
    data: TestCaseExportRequest,
    db: DbSessionDep,
    current_user_id: CurrentUserIdDep,
):
    """
    导出测试用例

    支持格式：
    - **excel**: Excel 表格（.xlsx）
    - **word**: Word 文档（.docx）
    - **json**: JSON 文件

    返回导出任务 ID 和状态查询 URL，可通过状态接口查询导出进度
    """
    # 获取项目
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_identifier(project_identifier)
    if not project:
        raise NotFoundException(resource_type="项目", resource_id=project_identifier)

    # 创建导出服务
    mongodb = await get_mongodb()
    export_service = TestCaseExportService(db, mongodb)

    # 启动导出任务
    result = await export_service.start_export(
        project_id=project.id,
        test_case_ids=data.test_case_ids,
        format=data.format,
        include_attachments=data.include_attachments,
        template=data.template,
    )

    return TestCaseExportResponse(
        success=True,
        export_id=result["export_id"],
        status=result["status"],
        status_url=result["status_url"],
    )


# 导出状态和下载接口（独立路由器）
exports_router = APIRouter(prefix="/testcase-exports")


@exports_router.get(
    "/{export_id}/status",
    response_model=TestCaseExportStatusResponse,
    summary="获取导出状态",
    description="获取测试用例导出任务的状态",
)
async def get_export_status(
    export_id: str,
    db: DbSessionDep,
):
    """
    获取导出状态

    返回导出任务的当前状态和下载 URL（如果已完成）
    """
    mongodb = await get_mongodb()
    export_service = TestCaseExportService(db, mongodb)

    status = await export_service.get_export_status(export_id)

    return TestCaseExportStatusResponse(
        success=True,
        export_id=status["export_id"],
        status=status["status"],
        download_url=status.get("download_url"),
        error_message=status.get("error_message"),
        created_at=status.get("created_at"),
        completed_at=status.get("completed_at"),
    )


@exports_router.get(
    "/{export_id}/download",
    summary="下载导出文件",
    description="下载已完成的测试用例导出文件",
)
async def download_export(
    export_id: str,
    db: DbSessionDep,
) -> StreamingResponse:
    """
    下载导出文件

    返回 Excel/Word/JSON 文件
    """
    mongodb = await get_mongodb()
    export_service = TestCaseExportService(db, mongodb)

    file_content, filename, content_type = await export_service.download_export(export_id)

    return StreamingResponse(
        iter([file_content]),
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
            "Content-Type": content_type,
        }
    )
