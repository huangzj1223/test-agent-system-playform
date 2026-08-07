"""
部门与岗位管理 API
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.department import (
    DepartmentCreate,
    DepartmentInfo,
    DepartmentUpdate,
    PositionCreate,
    PositionInfo,
    PositionUpdate,
)
from app.services.department_service import DepartmentService, PositionService

router = APIRouter(prefix="/departments")
position_router = APIRouter(prefix="/positions")


async def get_department_service(db: AsyncSession = Depends(get_db)) -> DepartmentService:
    return DepartmentService(db)


async def get_position_service(db: AsyncSession = Depends(get_db)) -> PositionService:
    return PositionService(db)


@router.get("", response_model=SuccessResponse[list[DepartmentInfo]], summary="获取部门树")
async def get_department_tree(
    _user: CurrentUserDep,
    service: DepartmentService = Depends(get_department_service),
):
    return SuccessResponse(data=await service.get_department_tree())


@router.post("", response_model=SuccessResponse[DepartmentInfo], summary="创建部门")
async def create_department(
    body: DepartmentCreate,
    _user: CurrentUserDep,
    service: DepartmentService = Depends(get_department_service),
):
    return SuccessResponse(data=await service.create_department(body))


@router.put("/{dept_id}", response_model=SuccessResponse[DepartmentInfo], summary="更新部门")
async def update_department(
    dept_id: UUID,
    body: DepartmentUpdate,
    _user: CurrentUserDep,
    service: DepartmentService = Depends(get_department_service),
):
    return SuccessResponse(data=await service.update_department(dept_id, body))


@router.delete("/{dept_id}", response_model=MessageResponse, summary="删除部门")
async def delete_department(
    dept_id: UUID,
    _user: CurrentUserDep,
    service: DepartmentService = Depends(get_department_service),
):
    await service.delete_department(dept_id)
    return MessageResponse(message="删除成功")


@position_router.get("", response_model=SuccessResponse[list[PositionInfo]], summary="获取岗位列表")
async def list_positions(
    _user: CurrentUserDep,
    service: PositionService = Depends(get_position_service),
):
    return SuccessResponse(data=await service.list_positions())


@position_router.post("", response_model=SuccessResponse[PositionInfo], summary="创建岗位")
async def create_position(
    body: PositionCreate,
    _user: CurrentUserDep,
    service: PositionService = Depends(get_position_service),
):
    return SuccessResponse(data=await service.create_position(body))


@position_router.put("/{pos_id}", response_model=SuccessResponse[PositionInfo], summary="更新岗位")
async def update_position(
    pos_id: UUID,
    body: PositionUpdate,
    _user: CurrentUserDep,
    service: PositionService = Depends(get_position_service),
):
    return SuccessResponse(data=await service.update_position(pos_id, body))


@position_router.delete("/{pos_id}", response_model=MessageResponse, summary="删除岗位")
async def delete_position(
    pos_id: UUID,
    _user: CurrentUserDep,
    service: PositionService = Depends(get_position_service),
):
    await service.delete_position(pos_id)
    return MessageResponse(message="删除成功")
