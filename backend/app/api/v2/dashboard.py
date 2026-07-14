"""System-wide quality command center endpoints."""

from fastapi import APIRouter

from app.api.deps import DbSessionDep
from app.schemas.dashboard import DashboardOverview
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard")


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(db: DbSessionDep) -> DashboardOverview:
    return await DashboardService(db).get_overview()
