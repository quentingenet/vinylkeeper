from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from app.schemas.dashboard_schema import (
    CollectionBreakdownResponse,
    CollectionValueResponse,
    DashboardStatsResponse,
    ValueRefreshResponse,
)
from app.services.album_price_service import run_price_requests
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


@router.get("/value", response_model=CollectionValueResponse)
@handle_app_exceptions
async def get_collection_value(
    collection_id: Optional[int] = Query(None, gt=0, description="One of the user's collections"),
    all_collections: bool = Query(False, alias="all", description="Every collection of the user"),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(get_current_user)
):
    """Estimated value from Discogs suggested prices: the largest collection unless one or all are asked."""
    return await dashboard_service.get_value(user, collection_id, all_collections)


@router.post("/value/refresh", response_model=ValueRefreshResponse)
@handle_app_exceptions
async def refresh_collection_value(
    background_tasks: BackgroundTasks,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    user=Depends(get_current_user)
):
    """Re-evaluate every collection of the user: prices older than a day are asked Discogs again, in the background."""
    result = await dashboard_service.request_value_refresh(user)
    if result.pending:
        background_tasks.add_task(run_price_requests)
    return result
