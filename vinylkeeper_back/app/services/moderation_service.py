from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.repositories.moderation_request_repository import ModerationRequestRepository
from app.repositories.place_repository import PlaceRepository
from app.models.moderation_request_model import ModerationRequest
from app.models.place_model import Place
from app.models.reference_data.moderation_statuses import ModerationStatus
from app.schemas.moderation_request_schema import (
    ModerationRequestCreate,
    ModerationRequestUpdate,
    ModerationRequestResponse,
    ModerationRequestListResponse
)
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    ValidationError,
    ServerError
)
from app.core.enums import ModerationStatusEnum
from app.core.logging import logger


class ModerationService:
    """Service for managing moderation requests"""

    def __init__(self, moderation_repository: ModerationRequestRepository, place_repository: PlaceRepository):
        self.moderation_repository = moderation_repository
        self.place_repository = place_repository

    async def get_all_moderation_requests(self, limit: Optional[int] = None, offset: Optional[int] = None) -> ModerationRequestListResponse:
        """Get all moderation requests with statistics."""
        try:
            requests = await self.moderation_repository.get_all_requests(limit, offset)
            stats = await self.moderation_repository.get_moderation_request_stats()
            
            response_requests = []
            for request in requests:
                response_requests.append(self._create_moderation_request_response(request))
            
            return ModerationRequestListResponse(
                items=response_requests,
                total=stats["total"],
                pending_count=stats["pending"],
                approved_count=stats["approved"],
                rejected_count=stats["rejected"]
            )
        except Exception as e:
            logger.error(f"Error getting moderation requests: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get moderation requests",
                details={"error": str(e)}
            )

    async def get_moderation_request_by_id(self, request_id: int) -> ModerationRequestResponse:
        """Get a moderation request by ID."""
        try:
            request = await self.moderation_repository.get_request_by_id(request_id)
            return self._create_moderation_request_response(request)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error getting moderation request: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get moderation request",
                details={"error": str(e)}
            )

    async def get_pending_moderation_requests(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ModerationRequestResponse]:
        """Get pending moderation requests."""
        try:
            requests = await self.moderation_repository.get_requests_by_status(1, limit, offset)  # Assuming 1 is pending status
            
            response_requests = []
            for request in requests:
                response_requests.append(self._create_moderation_request_response(request))
            
            return response_requests
        except Exception as e:
            logger.error(f"Error getting pending moderation requests: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get pending moderation requests",
                details={"error": str(e)}
            )

    async def update_moderation_request_status(self, request_id: int, new_status: str, admin_user_id: int) -> ModerationRequestResponse:
        """Update moderation request status and handle place moderation."""
        try:
            # Get the moderation request
            request = await self.moderation_repository.get_request_by_id(request_id)

            # Get the new status
            query = select(ModerationStatus).filter(ModerationStatus.name == new_status)
            result = await self.moderation_repository.db.execute(query)
            new_status_obj = result.scalar_one_or_none()
            
            if not new_status_obj:
                raise ValidationError(
                    error_code=4000,
                    message="Invalid moderation status"
                )

            # Update the moderation request status
            updated_request = await self.moderation_repository.update_request(
                request_id, {"status_id": new_status_obj.id}
            )

            # Handle place moderation based on status
            if new_status == ModerationStatusEnum.APPROVED.value:
                # Approve the place
                await self.place_repository.update_place(request.place_id, {"is_moderated": True})
                logger.info(f"Place {request.place_id} approved by admin {admin_user_id}")
            elif new_status == ModerationStatusEnum.REJECTED.value:
                # Reject the place (mark as invalid)
                await self.place_repository.update_place(request.place_id, {"is_moderated": False, "is_valid": False})
                logger.info(f"Place {request.place_id} rejected by admin {admin_user_id}")

            return self._create_moderation_request_response(updated_request)
        except (ResourceNotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Error updating moderation request status: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update moderation request status",
                details={"error": str(e)}
            )

    async def approve_moderation_request(self, request_id: int, admin_user_id: int) -> ModerationRequestResponse:
        """Approve a moderation request."""
        return await self.update_moderation_request_status(request_id, ModerationStatusEnum.APPROVED.value, admin_user_id)

    async def reject_moderation_request(self, request_id: int, admin_user_id: int) -> ModerationRequestResponse:
        """Reject a moderation request."""
        return await self.update_moderation_request_status(request_id, ModerationStatusEnum.REJECTED.value, admin_user_id)

    async def get_moderation_stats(self) -> dict:
        """Get moderation statistics."""
        try:
            return await self.moderation_repository.get_moderation_request_stats()
        except Exception as e:
            logger.error(f"Error getting moderation stats: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get moderation statistics",
                details={"error": str(e)}
            )

    def _create_moderation_request_response(self, request: ModerationRequest) -> ModerationRequestResponse:
        """Create a ModerationRequestResponse from a ModerationRequest model."""
        response_data = {
            "id": request.id,
            "place_id": request.place_id,
            "user_id": request.user_id,
            "status_id": request.status_id,
            "created_at": request.created_at,
            "submitted_at": request.submitted_at,
            "place": None,
            "user": None,
            "status": None
        }
        
        # Add place info if available
        if request.place:
            response_data["place"] = {
                "id": request.place.id,
                "name": request.place.name,
                "city": request.place.city,
                "country": request.place.country
            }
        
        # Add user info if available
        if request.user:
            response_data["user"] = {
                "id": request.user.id,
                "username": request.user.username
            }
        
        # Add status info if available
        if request.status:
            response_data["status"] = {
                "id": request.status.id,
                "name": request.status.name
            }
        
        return ModerationRequestResponse(**response_data) 