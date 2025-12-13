from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession


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
                response_requests.append(
                    self._create_moderation_request_response(request))

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
            # Get pending status ID from database
            pending_status = await self.moderation_repository.get_moderation_status_by_name(ModerationStatusEnum.PENDING.value)

            if not pending_status:
                raise ServerError(
                    error_code=5000,
                    message="Pending moderation status not found in database"
                )

            requests = await self.moderation_repository.get_requests_by_status(pending_status.id, limit, offset)

            response_requests = []
            for request in requests:
                response_requests.append(
                    self._create_moderation_request_response(request))

            return response_requests
        except ServerError:
            raise
        except Exception as e:
            logger.error(
                f"Error getting pending moderation requests: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get pending moderation requests",
                details={"error": str(e)}
            )

    async def update_moderation_request_status(self, request_id: int, new_status: str, admin_user_id: int) -> ModerationRequestResponse:
        """Update moderation request status and handle place moderation with transactional integrity."""
        try:
            # Get the moderation request
            request = await self.moderation_repository.get_request_by_id(request_id)

            # Get the new status
            new_status_obj = await self.moderation_repository.get_moderation_status_by_name(new_status)

            if not new_status_obj:
                raise ValidationError(
                    error_code=4000,
                    message="Invalid moderation status"
                )

            # Update the moderation request status
            await self.moderation_repository.update_request(
                request_id, {"status_id": new_status_obj.id}
            )

            # Handle place moderation based on status
            if new_status == ModerationStatusEnum.APPROVED.value:
                # Approve the place
                await self.place_repository.update_place(request.place_id, {"is_moderated": True})
            elif new_status == ModerationStatusEnum.REJECTED.value:
                # Reject the place (mark as invalid)
                await self.place_repository.update_place(request.place_id, {"is_moderated": False, "is_valid": False})

            # Commit the transaction
            await self.moderation_repository.db.commit()

            # Reload the moderation request to ensure relationships are hydrated
            reloaded_request = await self.moderation_repository.get_request_by_id(request_id)

            return self._create_moderation_request_response(reloaded_request)
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
            "place": request.place,
            "user": request.user,
            "status": request.status,
        }

        return ModerationRequestResponse.model_validate(response_data)
