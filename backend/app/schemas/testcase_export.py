"""
测试用例导出相关的 Pydantic 模型
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import BaseResponse
from app.schemas.enums import ExportStatus


ExportFormat = Literal["excel", "word", "json"]


class TestCaseExportRequest(BaseModel):
    """测试用例导出请求模型"""
    test_case_ids: list[str] = Field(
        ...,
        min_length=1,
        description="要导出的测试用例标识符列表，如 ['TC-1234', 'TC-1235']"
    )
    format: ExportFormat = Field(
        default="excel",
        description="导出格式: excel, word, json"
    )
    include_attachments: bool = Field(
        default=False,
        description="是否包含附件（暂未实现）"
    )
    template: str = Field(
        default="default",
        description="导出模板名称（暂未实现）"
    )


class TestCaseExportResponse(BaseResponse):
    """测试用例导出响应模型"""
    success: bool = Field(default=True)
    export_id: str = Field(..., description="导出任务 ID")
    status: str = Field(..., description="导出状态")
    status_url: str = Field(..., description="状态查询 URL")


class TestCaseExportStatusResponse(BaseResponse):
    """测试用例导出状态响应模型"""
    success: bool = Field(default=True)
    export_id: str = Field(..., description="导出任务 ID")
    status: str = Field(..., description="导出状态")
    download_url: Optional[str] = Field(default=None, description="下载 URL（完成后可用）")
    error_message: Optional[str] = Field(default=None, description="错误信息（失败时）")
    created_at: Optional[datetime] = Field(default=None, description="创建时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")