from typing import List, Optional
from fastapi import BackgroundTasks

from sqlalchemy.exc import IntegrityError

from app.repositories.atlas_repository import AtlasRepository
from app.repositories.moderation_request_repository import ModerationRequestRepository
from app.models.place_model import Place
from app.models.moderation_request_model import ModerationRequest
from app.schemas.place_schema import (
    PlaceCreate,
    PlaceUpdate,
    PlaceResponse,
    PublicPlaceResponse,
    PlaceMapResponse
)
from app.core.exceptions import ErrorCode, ForbiddenError, ServerError, ValidationError
from app.core.logging import logger
from app.core.enums import ModerationStatusEnum
from app.core.transaction import transaction_context

from app.utils.geocoding import geocode_city
from app.mails.client_mail import send_mail, MailSubject
from app.core.config_env import settings
from app.models.user_model import User
from app.schemas.moderation_request_schema import ModerationRequestCreate


class AtlasService:
    """Service for managing places"""

    def __init__(self, repository: AtlasRepository, moderation_request_repository: ModerationRequestRepository):
        self.repository = repository
        self.moderation_request_repository = moderation_request_repository

    async def create_place(
        self, place_data: PlaceCreate, user: User, background_tasks: BackgroundTasks
    ) -> PlaceResponse:
        """Create a new place and automatically create a moderation request with transactional integrity"""
        self._validate_place_data(place_data)

        if not await self.repository.get_place_type_by_id(place_data.place_type_id):
            raise ValidationError(
                error_code=ErrorCode.INVALID_REQUEST,
                message=f"Spot type with ID {place_data.place_type_id} not found"
            )

        place_dict = place_data.model_dump()
        place_dict["submitted_by_id"] = user.id
        place_dict["is_moderated"] = False

        # Check if coordinates are valid, if not, try to geocode
        latitude = place_dict.get("latitude")
        longitude = place_dict.get("longitude")

        # Force geocoding if coordinates are missing or invalid
        if (latitude is None or
            longitude is None or
            not (-90 <= latitude <= 90) or
                not (-180 <= longitude <= 180)):

            # Try to geocode the city
            coordinates = await geocode_city(place_data.city, place_data.country)

            if coordinates:
                place_dict["latitude"] = coordinates[0]
                place_dict["longitude"] = coordinates[1]
            else:
                # A city that does not exist is a wrong entry of the user, not a failure of the service
                logger.warning(
                    f"Failed to geocode {place_data.city}, {place_data.country}."
                    " Cannot create place without valid coordinates."
                )
                raise ValidationError(
                    error_code=ErrorCode.INVALID_REQUEST,
                    message=(
                        f"Could not find coordinates for {place_data.city}, {place_data.country}."
                        " Please check the city and country names."
                    )
                )
        async with transaction_context(self.repository.db):
            created_place = await self.repository.create_place(place_dict)
            await self._create_moderation_request(created_place.id, user.id)

        # Reload with relations (new place has is_valid=False, use internal method)
        full_place = await self.repository.get_place_by_id_internal(created_place.id)
        place_type_name = (
            full_place.place_type.name if (full_place and full_place.place_type)
            else str(place_data.place_type_id)
        )

        # Notify admins after commit and after the response (email failure must not roll back DB)
        self._notify_admin_of_suggestion(background_tasks, created_place, place_type_name, user)

        # Get likes info for the new place
        likes_count = await self.repository.get_place_likes_count(created_place.id)
        is_liked = False  # New place, so not liked by anyone yet

        # Create response with all data (use full_place for loaded relations, fallback to created_place)
        response = self._create_place_response(
            full_place or created_place, likes_count, is_liked)

        return response

    async def get_map_places(self) -> List[PlaceMapResponse]:
        """Get all moderated places with coordinates for map markers (ultra-lightweight, no relations or likes)."""
        places_tuples = await self.repository.get_map_places()

        if not places_tuples:
            return []

        # Lightweight responses: the marker, and the name and type for the list by city
        return [
            PlaceMapResponse(
                id=place_id,
                latitude=latitude,
                longitude=longitude,
                city=city,
                country=country,
                name=name,
                place_type=place_type,
            )
            for place_id, latitude, longitude, city, country, name, place_type in places_tuples
        ]

    async def get_places_by_location(
        self, country: str, city: str, user: Optional[User]
    ) -> List[PublicPlaceResponse]:
        """Moderated spots of a city (map popup). user None: a visitor, nothing is liked."""
        places = await self.repository.get_places_by_location(country, city)
        if not places:
            return []
        items, _dropped = await self._build_public_place_responses(places, user.id if user else None)
        return items

    async def update_place(
        self, user: User, place_id: int, place_data: PlaceUpdate, background_tasks: BackgroundTasks
    ) -> PlaceResponse:
        """Update an existing place. User resolved from token (uuid)."""
        place = await self.repository.get_place_by_id(place_id)

        if place.submitted_by_id != user.id:
            raise ForbiddenError(
                error_code=ErrorCode.FORBIDDEN,
                message="You don't have permission to update this spot"
            )

        update_dict = place_data.model_dump(exclude_unset=True)

        if "place_type_id" in update_dict:
            if not await self.repository.get_place_type_by_id(update_dict["place_type_id"]):
                raise ValidationError(
                    error_code=ErrorCode.INVALID_REQUEST,
                    message=f"Spot type with ID {update_dict['place_type_id']} not found"
                )

        # An approved place that changes goes back to moderation: hidden from the map
        # until an admin approves the new content, or the approval would cover anything
        content_changed = any(getattr(place, key) != value for key, value in update_dict.items())
        needs_moderation = content_changed and place.is_moderated
        if needs_moderation:
            update_dict["is_moderated"] = False

        async with transaction_context(self.repository.db):
            updated_place = await self.repository.update_place(place_id, update_dict)
            if needs_moderation:
                await self._create_moderation_request(place_id, user.id)

        if needs_moderation:
            place_type_name = updated_place.place_type.name if updated_place.place_type else ""
            self._notify_admin_of_suggestion(background_tasks, updated_place, place_type_name, user)

        likes_count = await self.repository.get_place_likes_count(place_id)
        is_liked = await self.repository.is_place_liked_by_user(user.id, place_id)

        return self._create_place_response(updated_place, likes_count, is_liked)

    async def like_place(self, user: User, place_id: int) -> dict:
        """Like a place (idempotent). User resolved from token (uuid)."""
        place = await self.repository.get_moderated_place_by_id(place_id)

        if await self.repository.is_place_liked_by_user(user.id, place_id):
            likes_count = await self.repository.get_place_likes_count(place_id)
            return {
                "message": f"Already liked {place.name}",
                "likes_count": likes_count,
                "is_liked": True
            }

        try:
            async with transaction_context(self.repository.db):
                await self.repository.like_place(user.id, place_id)
        except IntegrityError:
            # Race condition: another request inserted between our check and insert.
            # The DB unique constraint (uq_user_place_like) enforced correctness.
            likes_count = await self.repository.get_place_likes_count(place_id)
            return {
                "message": f"Already liked {place.name}",
                "likes_count": likes_count,
                "is_liked": True
            }

        likes_count = await self.repository.get_place_likes_count(place_id)
        return {
            "message": f"Successfully liked {place.name}",
            "likes_count": likes_count,
            "is_liked": True
        }

    async def unlike_place(self, user: User, place_id: int) -> dict:
        """Unlike a place (idempotent). User resolved from token (uuid)."""
        place = await self.repository.get_moderated_place_by_id(place_id)

        if not await self.repository.is_place_liked_by_user(user.id, place_id):
            likes_count = await self.repository.get_place_likes_count(place_id)
            return {
                "message": f"Not liked {place.name}",
                "likes_count": likes_count,
                "is_liked": False
            }

        async with transaction_context(self.repository.db):
            await self.repository.unlike_place(user.id, place_id)

        likes_count = await self.repository.get_place_likes_count(place_id)
        return {
            "message": f"Successfully unliked {place.name}",
            "likes_count": likes_count,
            "is_liked": False
        }

    @staticmethod
    def _notify_admin_of_suggestion(
        background_tasks: BackgroundTasks, place: Place, place_type_name: str, user: User
    ) -> None:
        """Email the admins, after the response, that a place awaits moderation."""
        background_tasks.add_task(
            AtlasService._send_suggestion_email,
            place.id,
            place_name=place.name,
            place_city=place.city,
            place_country=place.country,
            place_type=place_type_name,
            username=user.username,
            user_email=user.email,
            place_description=place.description,
        )

    @staticmethod
    async def _send_suggestion_email(place_id: int, **mail_fields) -> None:
        """Background task, plain values only. Never raises: the place is already saved."""
        try:
            email_sent = await send_mail(to=settings.EMAIL_ADMIN, subject=MailSubject.NewAtlasSpot, **mail_fields)
            if not email_sent:
                logger.warning("New place suggestion email could not be sent for place_id=%s", place_id)
        except Exception as mail_error:
            logger.error("New place suggestion email failed for place_id=%s: %s", place_id, mail_error)

    async def _create_moderation_request(self, place_id: int, user_id: int) -> ModerationRequest:
        """Create a moderation request for a place"""
        # Get pending status ID
        pending_status = await self.repository.get_moderation_status_by_name(ModerationStatusEnum.PENDING.value)

        if not pending_status:
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Pending moderation status not found in database"
            )

        # Create moderation request using Pydantic schema
        moderation_request_data = ModerationRequestCreate(
            place_id=place_id,
            user_id=user_id,
            status_id=pending_status.id
        )

        # Create the moderation request in database
        moderation_request = await self.moderation_request_repository.create_request(
            moderation_request_data.model_dump()
        )

        return moderation_request

    def _create_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PlaceResponse:
        """Create a PlaceResponse from a Place model"""
        # Add computed fields to the place object
        place.likes_count = likes_count
        place.is_liked = is_liked
        return PlaceResponse.model_validate(place)

    async def _build_public_place_responses(
        self, places: List[Place], user_id: int | None
    ) -> tuple[List[PublicPlaceResponse], int]:
        """Build PublicPlaceResponse list with likes; shared by all place list
        endpoints. Returns (items, dropped_count) so paginated callers can
        keep total/total_pages consistent with what's actually rendered."""
        place_ids = [p.id for p in places]
        likes_info = await self.repository.get_places_likes_info_batch(user_id, place_ids)
        counts = likes_info["counts"]
        user_likes = likes_info["user_likes"]
        result = []
        dropped = 0
        for place in places:
            try:
                likes_count = counts.get(place.id, 0)
                is_liked = user_likes.get(place.id, False) if user_id else False
                result.append(self._create_public_place_response(place, likes_count, is_liked))
            except Exception as e:
                logger.error(f"Error building response for place {place.id}: {e}", exc_info=True)
                dropped += 1
        return result, dropped

    def _create_public_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PublicPlaceResponse:
        """Create a PublicPlaceResponse from a Place model."""
        place.likes_count = likes_count
        place.is_liked = is_liked
        return PublicPlaceResponse.model_validate(place)

    def _validate_place_data(self, data: PlaceCreate) -> None:
        """Validate place data"""
        if not data.name or len(data.name.strip()) == 0:
            raise ValidationError(
                error_code=ErrorCode.INVALID_REQUEST,
                message="Spot name is required"
            )

        if not data.address or len(data.address.strip()) == 0:
            raise ValidationError(
                error_code=ErrorCode.INVALID_REQUEST,
                message="Address is required"
            )

        if not data.city or len(data.city.strip()) == 0:
            raise ValidationError(
                error_code=ErrorCode.INVALID_REQUEST,
                message="City is required"
            )

        if not data.country or len(data.country.strip()) == 0:
            raise ValidationError(
                error_code=ErrorCode.INVALID_REQUEST,
                message="Country is required"
            )

        if (data.latitude is None) != (data.longitude is None):
            raise ValidationError(
                error_code=ErrorCode.INVALID_REQUEST,
                message="Both latitude and longitude are required"
            )

    async def get_place_types(self) -> List:
        """Get all place types."""
        return await self.repository.get_all_place_types()
