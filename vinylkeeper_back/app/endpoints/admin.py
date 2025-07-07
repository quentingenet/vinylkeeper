from fastapi import APIRouter, Depends, status, Path, Query, HTTPException
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.moderation_request_schema import (
    ModerationRequestResponse,
    ModerationRequestListResponse
)
from app.services.moderation_service import ModerationService
from app.deps.deps import get_moderation_service, get_db
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.core.logging import logger
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    AppException,
    ValidationError,
    ServerError,
)

router = APIRouter()


@router.get("/moderation-requests", response_model=ModerationRequestListResponse, status_code=status.HTTP_200_OK)
async def get_moderation_requests(
    user: User = Depends(get_current_user),
    service: ModerationService = Depends(get_moderation_service),
    limit: Optional[int] = Query(None, gt=0, le=100),
    offset: Optional[int] = Query(None, ge=0)
):
    """Get all moderation requests (admin only)"""
    try:
        # Check if user is admin
        if user.role.name != "admin":
            raise ForbiddenError(
                error_code=4030,
                message="Admin access required"
            )
        
        requests = await service.get_all_moderation_requests(limit, offset)
        return requests
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Admin access required")
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting moderation requests: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/moderation-requests/pending", response_model=List[ModerationRequestResponse], status_code=status.HTTP_200_OK)
async def get_pending_moderation_requests(
    user: User = Depends(get_current_user),
    service: ModerationService = Depends(get_moderation_service),
    limit: Optional[int] = Query(None, gt=0, le=100),
    offset: Optional[int] = Query(None, ge=0)
):
    """Get pending moderation requests (admin only)"""
    try:
        # Check if user is admin
        if user.role.name != "admin":
            raise ForbiddenError(
                error_code=4030,
                message="Admin access required"
            )
        
        requests = await service.get_pending_moderation_requests(limit, offset)
        return requests
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Admin access required")
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting pending moderation requests: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/moderation-requests/{request_id}", response_model=ModerationRequestResponse, status_code=status.HTTP_200_OK)
async def get_moderation_request_by_id(
    request_id: int = Path(..., gt=0, title="Moderation Request ID"),
    user: User = Depends(get_current_user),
    service: ModerationService = Depends(get_moderation_service)
):
    """Get a specific moderation request (admin only)"""
    try:
        # Check if user is admin
        if user.role.name != "admin":
            raise ForbiddenError(
                error_code=4030,
                message="Admin access required"
            )
        
        request = await service.get_moderation_request_by_id(request_id)
        return request
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Admin access required")
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting moderation request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/moderation-requests/{request_id}/approve", response_model=ModerationRequestResponse, status_code=status.HTTP_200_OK)
async def approve_moderation_request(
    request_id: int = Path(..., gt=0, title="Moderation Request ID"),
    user: User = Depends(get_current_user),
    service: ModerationService = Depends(get_moderation_service)
):
    """Approve a moderation request (admin only)"""
    try:
        # Check if user is admin
        if user.role.name != "admin":
            raise ForbiddenError(
                error_code=4030,
                message="Admin access required"
            )
        
        approved_request = await service.approve_moderation_request(request_id, user.id)
        return approved_request
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Admin access required")
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error approving moderation request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/moderation-requests/{request_id}/reject", response_model=ModerationRequestResponse, status_code=status.HTTP_200_OK)
async def reject_moderation_request(
    request_id: int = Path(..., gt=0, title="Moderation Request ID"),
    user: User = Depends(get_current_user),
    service: ModerationService = Depends(get_moderation_service)
):
    """Reject a moderation request (admin only)"""
    try:
        # Check if user is admin
        if user.role.name != "admin":
            raise ForbiddenError(
                error_code=4030,
                message="Admin access required"
            )
        
        rejected_request = await service.reject_moderation_request(request_id, user.id)
        return rejected_request
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Admin access required")
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error rejecting moderation request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/moderation-stats", status_code=status.HTTP_200_OK)
async def get_moderation_stats(
    user: User = Depends(get_current_user),
    service: ModerationService = Depends(get_moderation_service)
):
    """Get moderation statistics (admin only)"""
    try:
        # Check if user is admin
        if user.role.name != "admin":
            raise ForbiddenError(
                error_code=4030,
                message="Admin access required"
            )
        
        stats = await service.get_moderation_stats()
        return stats
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Admin access required")
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting moderation stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error") 