from typing import Optional

from fastapi import APIRouter, Depends, Query
from app.schemas.dashboard_schema import CollectionBreakdownResponse, DashboardStatsResponse
from app.services.dashboard_service import DashboardService
from app.deps.deps import get_dashboard_service
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


@router.get("/breakdown", response_model=CollectionBreakdownResponse)
@handle_app_exceptions
async def get_collection_breakdown(
    collection_id: Optional[int] = Query(None, gt=0, description="One of the user's collections, all if omitted"),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(get_current_user)
):
    """The user's records by era, genre, mood and pressing: asked when the stats are shown."""
    return await dashboard_service.get_breakdown(user, collection_id)
