"""
智能测试 API 端点

提供 SSE 流式端点，让前端能实时接收智能测试进度：
- POST /api/v2/projects/{pid}/smart-test/run — 启动智能测试（SSE 流）
- GET  /api/v2/projects/{pid}/smart-test/tasks — 历史任务列表
- GET  /api/v2/projects/{pid}/smart-test/tasks/{tid} — 任务详情
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from app.api.deps import CurrentUserIdDep
from app.services.smart_test_service import (
    execute_smart_test,
    get_task,
    list_tasks,
)

router = APIRouter()


# ============================================================================
# Request / Response schemas
# ============================================================================


class SmartTestRunRequest(BaseModel):
    """启动智能测试请求"""
    target_url: str = Field(..., description="目标测试网站 URL", min_length=1)
    description: str = Field(..., description="测试描述，如：测试知识库菜单中公共知识库的创建功能", min_length=1)


class SmartTestTaskInfo(BaseModel):
    """任务摘要信息"""
    id: str
    project_identifier: str
    target_url: str
    description: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    phases: list[dict] = []


class SmartTestTaskListResponse(BaseModel):
    """任务列表响应"""
    items: list[SmartTestTaskInfo]
    total: int


# ============================================================================
# API Endpoints
# ============================================================================


@router.post("/run", summary="启动智能测试（SSE 流式响应）")
async def run_smart_test(
    project_identifier: str,
    body: SmartTestRunRequest,
    current_user_id: CurrentUserIdDep,
):
    """
    启动智能测试任务，通过 SSE 实时推送进度。

    事件类型：
    - PHASE_START: 阶段开始
    - PHASE_PROGRESS: 阶段进度
    - PHASE_OUTPUT: 阶段产出
    - PHASE_COMPLETE: 阶段完成
    - PHASE_ERROR: 阶段错误
    - TASK_COMPLETE: 任务完成
    - TASK_ERROR: 任务失败
    """
    async def event_generator():
        async for event in execute_smart_test(
            project_identifier=project_identifier,
            target_url=body.target_url,
            description=body.description,
        ):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/tasks", response_model=SmartTestTaskListResponse, summary="获取历史任务列表")
async def get_tasks(
    project_identifier: str,
    current_user_id: CurrentUserIdDep,
):
    """获取指定项目下的所有智能测试任务"""
    tasks = list_tasks(project_identifier)
    items = [
        SmartTestTaskInfo(
            id=t.id,
            project_identifier=t.project_identifier,
            target_url=t.target_url,
            description=t.description,
            status=t.status,
            created_at=t.created_at,
            completed_at=t.completed_at if t.completed_at else None,
            phases=[p.to_dict() for p in t.phases],
        )
        for t in tasks
    ]
    # 按时间倒序排列
    items.sort(key=lambda x: x.created_at, reverse=True)
    return SmartTestTaskListResponse(items=items, total=len(items))


@router.get("/tasks/{task_id}", response_model=SmartTestTaskInfo, summary="获取任务详情")
async def get_task_detail(
    project_identifier: str,
    task_id: str,
    current_user_id: CurrentUserIdDep,
):
    """获取指定智能测试任务的详细信息"""
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")
    if task.project_identifier != project_identifier:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该任务")
    return SmartTestTaskInfo(
        id=task.id,
        project_identifier=task.project_identifier,
        target_url=task.target_url,
        description=task.description,
        status=task.status,
        created_at=task.created_at,
        completed_at=task.completed_at if task.completed_at else None,
        phases=[p.to_dict() for p in task.phases],
    )
