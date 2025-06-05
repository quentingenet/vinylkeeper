from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.schemas.dashboard_schema import DashboardStatsResponse
from app.services.dashboard_service import DashboardService
from app.deps.deps import get_dashboard_service
from app.core.exceptions import ServerError
from app.utils.auth_utils.auth import get_current_user

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    year: int = Query(default=2025, description="Year for stats"),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(get_current_user)
):
    try:
        return dashboard_service.get_dashboard_stats(year, user)
    except ServerError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": str(e)}
        )
