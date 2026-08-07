"""
菜单管理 API
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth_guard import CurrentUserDep
from app.schemas.common import MessageResponse, SuccessResponse
from app.schemas.menu import MenuCreate, MenuInfo, MenuUpdate
from app.services.menu_service import MenuService

router = APIRouter(prefix="/menus")


async def get_menu_service(db: AsyncSession = Depends(get_db)) -> MenuService:
    return MenuService(db)


@router.get("", response_model=SuccessResponse[list[MenuInfo]], summary="获取菜单树")
async def get_menu_tree(
    _user: CurrentUserDep,
    service: MenuService = Depends(get_menu_service),
):
    tree = await service.get_menu_tree()
    return SuccessResponse(data=tree)


@router.post("", response_model=SuccessResponse[MenuInfo], summary="创建菜单")
async def create_menu(
    body: MenuCreate,
    _user: CurrentUserDep,
    service: MenuService = Depends(get_menu_service),
):
    return SuccessResponse(data=await service.create_menu(body))


@router.put("/{menu_id}", response_model=SuccessResponse[MenuInfo], summary="更新菜单")
async def update_menu(
    menu_id: UUID,
    body: MenuUpdate,
    _user: CurrentUserDep,
    service: MenuService = Depends(get_menu_service),
):
    return SuccessResponse(data=await service.update_menu(menu_id, body))


@router.delete("/{menu_id}", response_model=MessageResponse, summary="删除菜单")
async def delete_menu(
    menu_id: UUID,
    _user: CurrentUserDep,
    service: MenuService = Depends(get_menu_service),
):
    await service.delete_menu(menu_id)
    return MessageResponse(message="删除成功")
