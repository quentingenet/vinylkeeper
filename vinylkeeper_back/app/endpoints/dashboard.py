from fastapi import APIRouter, Depends
from app.schemas.dashboard_schema import DashboardStatsResponse
from app.services.dashboard_service import DashboardService
from app.deps.deps import get_dashboard_service
from app.core.exceptions import ServerError
from app.utils.auth_utils.auth import get_current_user
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsResponse)
@handle_app_exceptions
async def get_dashboard_stats(
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(get_current_user)
):
    return await dashboard_service.get_dashboard_stats(user)
