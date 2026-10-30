from typing import Literal

from fastapi import APIRouter, Body, Depends, status, Path, Query

from app.schemas.moderation_request_schema import (
    ModerationRequestResponse,
    ModerationRequestListResponse,
    PaginatedModerationRequestResponse,
    ModerationStatsResponse,
    MODERATION_DEFAULT_LIMIT,
    MODERATION_MAX_LIMIT,
)
from app.schemas.place_report_schema import (
    PLACE_REPORTS_DEFAULT_LIMIT,
    PLACE_REPORTS_MAX_LIMIT,
    PlaceReportListResponse,
    PlaceReportResponse,
    ReportedPlace,
)
from app.schemas.place_schema import PlaceUpdate
from app.services.moderation_service import ModerationService
from app.services.place_report_service import PlaceReportService
from app.deps.deps import get_moderation_service, get_place_report_service, require_admin
from app.models.user_model import User
from app.utils.endpoint_utils import handle_app_exceptions
from app.core.logging import log_activity

router = APIRouter()


def _spot(request: ModerationRequestResponse) -> str:
    """'#12 'Sofa Records'' for the activity log, the id alone when the place is not loaded."""
    return f"#{request.place_id} {request.place.name!r}" if request.place else f"#{request.place_id}"


@router.get("/moderation-requests", response_model=ModerationRequestListResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_moderation_requests(
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(MODERATION_DEFAULT_LIMIT, gt=0, le=MODERATION_MAX_LIMIT, description="Items per page"),
):
    """Get all moderation requests with pagination (admin only)"""
    return await service.get_all_moderation_requests(page, limit)


@router.get(
    "/moderation-requests/pending",
    response_model=PaginatedModerationRequestResponse,
    status_code=status.HTTP_200_OK
)
@handle_app_exceptions
async def get_pending_moderation_requests(
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(MODERATION_DEFAULT_LIMIT, gt=0, le=MODERATION_MAX_LIMIT, description="Items per page"),
):
    """Get pending moderation requests with pagination (admin only)"""
    return await service.get_pending_moderation_requests(page, limit)


@router.get(
    "/moderation-requests/{request_id}",
    response_model=ModerationRequestResponse,
    status_code=status.HTTP_200_OK
)
@handle_app_exceptions
async def get_moderation_request_by_id(
    request_id: int = Path(..., gt=0, title="Moderation Request ID"),
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service)
):
    """Get a specific moderation request (admin only)"""
    request = await service.get_moderation_request_by_id(request_id)
    return request


@router.post(
    "/moderation-requests/{request_id}/approve",
    response_model=ModerationRequestResponse,
    status_code=status.HTTP_200_OK
)
@handle_app_exceptions
async def approve_moderation_request(
    request_id: int = Path(..., gt=0, title="Moderation Request ID"),
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service)
):
    """Approve a moderation request (admin only)"""
    approved_request = await service.approve_moderation_request(request_id, user.id)
    log_activity(f"admin {user.username}", f"approved Atlas spot {_spot(approved_request)} (now on the map)")
    return approved_request


@router.post(
    "/moderation-requests/{request_id}/reject",
    response_model=ModerationRequestResponse,
    status_code=status.HTTP_200_OK
)
@handle_app_exceptions
async def reject_moderation_request(
    request_id: int = Path(..., gt=0, title="Moderation Request ID"),
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service)
):
    """Reject a moderation request (admin only)"""
    rejected_request = await service.reject_moderation_request(request_id, user.id)
    log_activity(f"admin {user.username}", f"rejected Atlas spot {_spot(rejected_request)}")
    return rejected_request


@router.get("/moderation-stats", response_model=ModerationStatsResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_moderation_stats(
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service)
):
    """Get moderation statistics (admin only)"""
    stats = await service.get_moderation_stats()
    return stats


@router.get("/place-reports", response_model=PlaceReportListResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_place_reports(
    report_status: Literal["open", "resolved", "dismissed", "all"] = Query("open", alias="status"),
    page: int = Query(1, gt=0),
    limit: int = Query(PLACE_REPORTS_DEFAULT_LIMIT, gt=0, le=PLACE_REPORTS_MAX_LIMIT),
    user: User = Depends(require_admin),
    service: PlaceReportService = Depends(get_place_report_service),
):
    """Reports of wrong information on Atlas spots, open ones first (admin only)"""
    return await service.list_reports(None if report_status == "all" else report_status, page, limit)


@router.post("/place-reports/{report_id}/resolve", response_model=PlaceReportResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def resolve_place_report(
    report_id: int = Path(..., gt=0),
    user: User = Depends(require_admin),
    service: PlaceReportService = Depends(get_place_report_service),
):
    """The spot was fixed: every open report of it is resolved (admin only)"""
    report = await service.resolve(report_id, user)
    log_activity(f"admin {user.username}",
                 f"resolved the reports of Atlas spot #{report.place.id} {report.place.name!r}")
    return report


@router.post("/place-reports/{report_id}/dismiss", response_model=PlaceReportResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def dismiss_place_report(
    report_id: int = Path(..., gt=0),
    user: User = Depends(require_admin),
    service: PlaceReportService = Depends(get_place_report_service),
):
    """Nothing was wrong: only this report is closed (admin only)"""
    report = await service.dismiss(report_id, user)
    log_activity(f"admin {user.username}", f"dismissed report #{report_id} on Atlas spot #{report.place.id}")
    return report


@router.patch("/places/{place_id}", response_model=ReportedPlace, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def update_place_as_admin(
    place_id: int = Path(..., gt=0),
    data: PlaceUpdate = Body(...),
    user: User = Depends(require_admin),
    service: PlaceReportService = Depends(get_place_report_service),
):
    """Correct any field of a spot, published at once without moderation (admin only)"""
    return await service.update_place(user, place_id, data)


@router.delete("/places/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_app_exceptions
async def remove_place_as_admin(
    place_id: int = Path(..., gt=0),
    user: User = Depends(require_admin),
    service: PlaceReportService = Depends(get_place_report_service),
):
    """Take a permanently closed spot off the map; its open reports are resolved (admin only)"""
    await service.remove_place(user, place_id)
