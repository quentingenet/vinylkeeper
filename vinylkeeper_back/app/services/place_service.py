import asyncio
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, NoResultFound


from app.repositories.place_repository import PlaceRepository
from app.repositories.moderation_request_repository import ModerationRequestRepository
from app.models.place_model import Place
from app.models.moderation_request_model import ModerationRequest
from app.models.reference_data.moderation_statuses import ModerationStatus
from app.models.reference_data.place_types import PlaceType
from app.schemas.place_schema import (
    PlaceCreate,
    PlaceUpdate,
    PlaceResponse,
    PublicPlaceResponse,
    PlaceInDB,
    PlaceMapResponse
)
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    ServerError,
    ValidationError,
    ErrorCode
)
from app.core.logging import logger
from app.core.enums import ModerationStatusEnum, RoleEnum

from app.utils.geocoding import geocode_city
from app.mails.client_mail import send_mail, MailSubject
from app.core.config_env import settings
from app.models.user_model import User
from app.schemas.moderation_request_schema import ModerationRequestCreate


class PlaceService:
    """Service for managing places"""

    def __init__(self, repository: PlaceRepository, moderation_request_repository: ModerationRequestRepository):
        self.repository = repository
        self.moderation_request_repository = moderation_request_repository

    async def create_place(self, place_data: PlaceCreate, user: User) -> PlaceResponse:
        """Create a new place and automatically create a moderation request with transactional integrity"""
        try:
            # Validate place data
            self._validate_place_data(place_data)

            # Get place type ID from name
            place_type_id = await self._get_place_type_id_by_name(place_data.place_type_id)

            # Prepare place data
            place_dict = place_data.model_dump()
            place_dict["place_type_id"] = place_type_id
            place_dict["submitted_by_id"] = user.id
            # New places are not moderated initially
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
                    logger.error(
                        f"Failed to geocode {place_data.city}, {place_data.country}. Cannot create place without valid coordinates.")
                    raise ValidationError(
                        error_code=4000,
                        message=f"Could not find coordinates for {place_data.city}, {place_data.country}. Please check the city and country names."
                    )
            # Coordinates are already valid, no action needed

            # Create place
            created_place = await self.repository.create_place(place_dict)

            # Create moderation request automatically
            moderation_request = await self._create_moderation_request(created_place.id, user.id)

            # Notify admins about the new place suggestion
            try:
                email_sent = await send_mail(
                    to=settings.EMAIL_ADMIN,
                    subject=MailSubject.NewPlaceSuggestion,
                    place_name=created_place.name,
                    place_city=created_place.city,
                    place_country=created_place.country,
                    place_type=place_data.place_type_id,
                    username=user.username,
                    user_email=user.email,
                    place_description=created_place.description,
                )
                if not email_sent:
                    logger.warning(
                        "New place suggestion email could not be sent for place_id=%s", created_place.id
                    )
            except Exception as mail_error:
                logger.error(
                    "New place suggestion email failed for place_id=%s: %s", created_place.id, mail_error
                )
            # Commit the transaction
            await self.repository.db.commit()

            # Get likes info for the new place
            likes_count = await self.repository.get_place_likes_count(created_place.id)
            is_liked = False  # New place, so not liked by anyone yet

            # Create response with all data
            response = self._create_place_response(
                created_place, likes_count, is_liked)

            return response

        except (DuplicateFieldError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error creating place: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create place",
                details={"error": str(e)}
            )

    async def get_place(self, place_id: int, user_id: Optional[int] = None) -> PublicPlaceResponse:
        """Get a place by ID (only moderated places)."""
        try:
            place = await self.repository.get_moderated_place_by_id(place_id)

            # Get likes info
            likes_count = await self.repository.get_place_likes_count(place_id)
            is_liked = False
            if user_id:
                is_liked = await self.repository.is_place_liked_by_user(user_id, place_id)

            return self._create_public_place_response(place, likes_count, is_liked)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get place",
                details={"error": str(e)}
            )

    async def get_map_places(self) -> List[PlaceMapResponse]:
        """Get all moderated places with coordinates for map markers (ultra-lightweight, no relations or likes)."""
        try:
            places_tuples = await self.repository.get_map_places()

            if not places_tuples:
                return []

            # Build lightweight responses directly from tuples (id, latitude, longitude, city)
            return [
                PlaceMapResponse(
                    id=place_id,
                    latitude=latitude,
                    longitude=longitude,
                    city=city
                )
                for place_id, latitude, longitude, city in places_tuples
            ]
        except Exception as e:
            logger.error(f"Error in get_map_places: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get map places",
                details={"error": str(e)}
            )

    async def get_places_by_coordinates(self, latitude: float, longitude: float, user_id: int) -> List[PublicPlaceResponse]:
        """Get all moderated places at exact coordinates (with full details including likes)."""
        try:
            places = await self.repository.get_places_by_coordinates(latitude, longitude)

            if not places:
                return []

            place_ids = [place.id for place in places]

            # Get likes info in batch (user_id is always provided since auth is required)
            likes_counts, user_likes = await asyncio.gather(
                self.repository.get_places_likes_counts(place_ids),
                self.repository.get_user_places_likes(user_id, place_ids)
            )

            response_places = []
            for place in places:
                likes_count = likes_counts.get(place.id, 0)
                is_liked = user_likes.get(place.id, False)
                response_places.append(self._create_public_place_response(
                    place, likes_count, is_liked))

            return response_places
        except Exception as e:
            logger.error(f"Error in get_places_by_coordinates: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get places by coordinates",
                details={"error": str(e)}
            )

    async def get_all_places(self, user_id: Optional[int] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get all places with optional pagination (only moderated places)."""
        try:
            places = await self.repository.get_all_moderated_places(limit, offset)

            if not places:
                return []

            # Get all place IDs
            place_ids = [place.id for place in places]

            # Get likes info for all places in parallel (2 queries executed simultaneously)
            if user_id:
                # Execute both queries in parallel for better performance
                likes_counts, user_likes = await asyncio.gather(
                    self.repository.get_places_likes_counts(place_ids),
                    self.repository.get_user_places_likes(user_id, place_ids)
                )
            else:
                # Only get likes counts if no user (no need for user_likes)
                likes_counts = await self.repository.get_places_likes_counts(place_ids)
                user_likes = {}

            # Build responses efficiently
            response_places = []
            for place in places:
                try:
                    likes_count = likes_counts.get(place.id, 0)
                    is_liked = user_likes.get(
                        place.id, False) if user_id else False

                    response_places.append(self._create_public_place_response(
                        place, likes_count, is_liked))
                except Exception as place_error:
                    logger.error(
                        f"Error processing place {place.id}: {str(place_error)}")
                    # Continue with other places even if one fails
                    continue

            return response_places
        except Exception as e:
            logger.error(f"Error in get_all_places: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get places",
                details={"error": str(e)}
            )

    async def update_place(self, user_id: int, place_id: int, place_data: PlaceUpdate) -> PlaceResponse:
        """Update an existing place"""
        try:
            place = await self.repository.get_place_by_id(place_id)

            # Check if user can update this place (owner or admin)
            if place.submitted_by_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to update this place"
                )

            # Update place
            update_dict = place_data.model_dump(exclude_unset=True)
            updated_place = await self.repository.update_place(place_id, update_dict)

            # Commit the transaction to persist the place update
            await self.repository.db.commit()

            # Get likes info
            likes_count = await self.repository.get_place_likes_count(place_id)
            is_liked = await self.repository.is_place_liked_by_user(user_id, place_id)

            return self._create_place_response(updated_place, likes_count, is_liked)
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to update place",
                details={"error": str(e)}
            )

    async def delete_place(self, user_id: int, place_id: int) -> bool:
        """Soft delete a place"""
        try:
            place = await self.repository.get_place_by_id(place_id)

            # Check if user can delete this place (owner or admin)
            if place.submitted_by_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to delete this place"
                )

            result = await self.repository.delete_place(place_id)
            # Commit the transaction to persist the place deletion
            await self.repository.db.commit()
            return result
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to delete place",
                details={"error": str(e)}
            )

    async def like_place(self, user_id: int, place_id: int) -> dict:
        """Like a place with transactional integrity"""
        try:
            # Verify place exists and is moderated
            place = await self.repository.get_moderated_place_by_id(place_id)

            # Like the place
            await self.repository.like_place(user_id, place_id)
            await self.repository.db.commit()  # Commit the transaction

            # Get updated likes count
            likes_count = await self.repository.get_place_likes_count(place_id)

            return {
                "message": f"Successfully liked {place.name}",
                "likes_count": likes_count,
                "is_liked": True
            }
        except (ResourceNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to like place",
                details={"error": str(e)}
            )

    async def unlike_place(self, user_id: int, place_id: int) -> dict:
        """Unlike a place with transactional integrity"""
        try:
            # Verify place exists and is moderated
            place = await self.repository.get_moderated_place_by_id(place_id)

            # Unlike the place
            await self.repository.unlike_place(user_id, place_id)
            await self.repository.db.commit()  # Commit the transaction

            # Get updated likes count
            likes_count = await self.repository.get_place_likes_count(place_id)

            return {
                "message": f"Successfully unliked {place.name}",
                "likes_count": likes_count,
                "is_liked": False
            }
        except (ResourceNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to unlike place",
                details={"error": str(e)}
            )

    async def search_places(self, search_term: str, user_id: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Search places by name, city, or country (only moderated places)."""
        try:
            places = await self.repository.search_moderated_places(search_term)

            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = await self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = await self.repository.is_place_liked_by_user(user_id, place.id)

                response_places.append(self._create_public_place_response(
                    place, likes_count, is_liked))

            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to search places",
                details={"error": str(e)}
            )

    async def get_places_by_type(self, place_type_id: int, user_id: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get places by type (only moderated places)."""
        try:
            places = await self.repository.get_moderated_places_by_type(place_type_id)

            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = await self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = await self.repository.is_place_liked_by_user(user_id, place.id)

                response_places.append(self._create_public_place_response(
                    place, likes_count, is_liked))

            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get places by type",
                details={"error": str(e)}
            )

    async def get_places_in_region(self, min_lat: float, max_lat: float, min_lng: float, max_lng: float, user_id: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get places within a geographic region (only moderated places)."""
        try:
            places = await self.repository.get_moderated_places_in_region(min_lat, max_lat, min_lng, max_lng)

            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = await self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = await self.repository.is_place_liked_by_user(user_id, place.id)

                response_places.append(self._create_public_place_response(
                    place, likes_count, is_liked))

            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get places in region",
                details={"error": str(e)}
            )

    async def _create_moderation_request(self, place_id: int, user_id: int) -> ModerationRequest:
        """Create a moderation request for a place"""
        try:
            # Get pending status ID
            pending_status = await self.repository.get_moderation_status_by_name(ModerationStatusEnum.PENDING.value)

            if not pending_status:
                raise ServerError(
                    error_code=5000,
                    message="Pending moderation status not found in database"
                )

            # Create moderation request using Pydantic schema
            moderation_request_data = ModerationRequestCreate(
                place_id=place_id,
                user_id=user_id,
                status_id=pending_status.id
            )

            # Create the moderation request in database
            moderation_request = await self.moderation_request_repository.create_request(moderation_request_data.model_dump())

            return moderation_request
        except Exception as e:
            logger.error(f"Exception in _create_moderation_request: {str(e)}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise ServerError(
                error_code=5000,
                message="Failed to create moderation request",
                details={"error": str(e)}
            )

    def _create_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PlaceResponse:
        """Create a PlaceResponse from a Place model"""
        # Add computed fields to the place object
        place.likes_count = likes_count
        place.is_liked = is_liked
        return PlaceResponse.model_validate(place)

    def _create_public_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PublicPlaceResponse:
        """Create a PublicPlaceResponse from a Place model"""
        # Add computed fields to the place object
        place.likes_count = likes_count
        place.is_liked = is_liked
        return PublicPlaceResponse.model_validate(place)

    def _validate_place_data(self, data: PlaceCreate) -> None:
        """Validate place data"""
        if not data.name or len(data.name.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="Place name is required"
            )

        if not data.city or len(data.city.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="City is required"
            )

        if not data.country or len(data.country.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="Country is required"
            )

        if not data.place_type_id or len(data.place_type_id.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="Place type is required"
            )

    async def _get_place_type_id_by_name(self, place_type_name: str) -> int:
        """Get place type ID from name"""
        place_type = await self.repository.get_place_type_by_name(place_type_name)

        if not place_type:
            raise ValidationError(
                error_code=4000,
                message=f"Place type '{place_type_name}' not found"
            )

        return place_type.id

    async def get_all_places_admin(self, user_id: Optional[int] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[PlaceResponse]:
        """Get all places (admin only - includes non-moderated places)."""
        try:
            places = await self.repository.get_all_places(limit, offset)

            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = await self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = await self.repository.is_place_liked_by_user(user_id, place.id)

                response_places.append(self._create_place_response(
                    place, likes_count, is_liked))

            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get all places",
                details={"error": str(e)}
            )

    async def get_place_admin(self, place_id: int, user_id: Optional[int] = None) -> PlaceResponse:
        """Get a place by ID (admin only - includes non-moderated places)."""
        try:
            place = await self.repository.get_place_by_id(place_id)

            # Get likes info
            likes_count = await self.repository.get_place_likes_count(place_id)
            is_liked = False
            if user_id:
                is_liked = await self.repository.is_place_liked_by_user(user_id, place_id)

            return self._create_place_response(place, likes_count, is_liked)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get place",
                details={"error": str(e)}
            )
