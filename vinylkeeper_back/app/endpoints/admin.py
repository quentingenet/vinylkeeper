from fastapi import APIRouter, Depends, status, Path, Query

from app.schemas.moderation_request_schema import (
    ModerationRequestResponse,
    ModerationRequestListResponse,
    PaginatedModerationRequestResponse,
    MODERATION_DEFAULT_LIMIT,
    MODERATION_MAX_LIMIT,
)
from app.services.moderation_service import ModerationService
from app.deps.deps import get_moderation_service, require_admin
from app.models.user_model import User
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


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
    return rejected_request


@router.get("/moderation-stats", response_model=dict, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_moderation_stats(
    user: User = Depends(require_admin),
    service: ModerationService = Depends(get_moderation_service)
):
    """Get moderation statistics (admin only)"""
    stats = await service.get_moderation_stats()
    return stats
