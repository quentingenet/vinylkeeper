from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy import select

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
    PlaceInDB
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

    async def create_place(self, place_data: PlaceCreate, user_id: int) -> PlaceResponse:
        """Create a new place and automatically create a moderation request"""
        try:
            # Validate place data
            self._validate_place_data(place_data)
            
            # Get place type ID from name
            place_type_id = await self._get_place_type_id_by_name(place_data.place_type_id)
            
            # Prepare place data
            place_dict = place_data.model_dump()
            place_dict["place_type_id"] = place_type_id
            place_dict["submitted_by_id"] = user_id
            place_dict["is_moderated"] = False  # New places are not moderated initially
            
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
                    logger.error(f"Failed to geocode {place_data.city}, {place_data.country}. Cannot create place without valid coordinates.")
                    raise ValidationError(
                        error_code=4000,
                        message=f"Could not find coordinates for {place_data.city}, {place_data.country}. Please check the city and country names."
                    )
            else:
                pass
            
            # Create place
            created_place = await self.repository.create_place(place_dict)
            
            # Create moderation request automatically
            moderation_request = await self._create_moderation_request(created_place.id, user_id)
            
            # Get user info for email
            query = select(User).filter(User.id == user_id)
            result = await self.repository.db.execute(query)
            user = result.scalar_one_or_none()
            
            # Send email notification
            if settings.APP_ENV == "development" or (user.role.name == RoleEnum.ADMIN.value and user.is_superuser):
                pass
            else:
                try:
                    await send_mail(
                        to=settings.EMAIL_ADMIN,
                        subject=MailSubject.NewPlaceSuggestion,
                        place_name=created_place.name,
                        place_city=created_place.city,
                        place_country=created_place.country,
                        place_type=created_place.place_type.name if created_place.place_type else "Unknown",
                        username=user.username if user else "Unknown",
                        user_email=user.email if user else "Unknown",
                        place_description=created_place.description
                    )
                    logger.info(f"Email notification sent for new place suggestion: {created_place.name}")
                except Exception as e:
                    logger.error(f"Failed to send email notification for place suggestion: {str(e)}")
                    # Don't fail the entire operation if email fails
            
            # Get likes info for the new place
            likes_count = await self.repository.get_place_likes_count(created_place.id)
            is_liked = False  # New place, so not liked by anyone yet
            
            # Create response with all data
            response = self._create_place_response(created_place, likes_count, is_liked)
            
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

    async def get_all_places(self, user_id: Optional[int] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get all places with optional pagination (only moderated places)."""
        try:
            places = await self.repository.get_all_moderated_places(limit, offset)
            
            # Get likes info for each place
            response_places = []
            for place in places:
                try:
                    likes_count = await self.repository.get_place_likes_count(place.id)
                    is_liked = False
                    if user_id:
                        is_liked = await self.repository.is_place_liked_by_user(user_id, place.id)
                    
                    response_places.append(self._create_public_place_response(place, likes_count, is_liked))
                except Exception as place_error:
                    logger.error(f"Error processing place {place.id}: {str(place_error)}")
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

            return await self.repository.delete_place(place_id)
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to delete place",
                details={"error": str(e)}
            )

    async def like_place(self, user_id: int, place_id: int) -> dict:
        """Like a place"""
        try:
            # Verify place exists and is moderated
            place = await self.repository.get_moderated_place_by_id(place_id)
            
            # Like the place
            await self.repository.like_place(user_id, place_id)
            
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
        """Unlike a place"""
        try:
            # Verify place exists and is moderated
            place = await self.repository.get_moderated_place_by_id(place_id)
            
            # Unlike the place
            await self.repository.unlike_place(user_id, place_id)
            
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
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
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
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
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
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
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
            query = select(ModerationStatus).filter(ModerationStatus.name == ModerationStatusEnum.PENDING.value)
            result = await self.repository.db.execute(query)
            pending_status = result.scalar_one_or_none()
            
            # Add logging to debug the issue
            logger.info(f"Looking for moderation status: '{ModerationStatusEnum.PENDING.value}'")
            logger.info(f"Found status: {pending_status}")
            
            if not pending_status:
                # Let's also check what statuses exist in the database
                all_statuses_query = select(ModerationStatus)
                all_result = await self.repository.db.execute(all_statuses_query)
                all_statuses = all_result.scalars().all()
                logger.error(f"Available moderation statuses: {[s.name for s in all_statuses]}")
                
                raise ServerError(
                    error_code=5000,
                    message="Pending moderation status not found in database"
                )
            
            logger.info(f"Creating moderation request with place_id={place_id}, user_id={user_id}, status_id={pending_status.id}")
            
            # Create moderation request using Pydantic schema
            moderation_request_data = ModerationRequestCreate(
                place_id=place_id,
                user_id=user_id,
                status_id=pending_status.id
            )
            
            logger.info(f"ModerationRequest data created: {moderation_request_data}")
            
            # Create the moderation request in database
            moderation_request = await self.moderation_request_repository.create_request(moderation_request_data.model_dump())
            
            logger.info(f"ModerationRequest created in database: {moderation_request}")
            
            return moderation_request
        except Exception as e:
            await self.repository.db.rollback()
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
        # Create place_type dictionary
        place_type_dict = {
            "id": place.place_type.id,
            "name": place.place_type.name
        } if place.place_type else None
        
        # Create submitted_by dictionary
        submitted_by_dict = {
            "id": place.submitted_by.id,
            "username": place.submitted_by.username
        } if place.submitted_by else None
        
        # Create response with all required fields
        place_data = {
            "id": place.id,
            "name": place.name,
            "description": place.description,
            "address": place.address,
            "city": place.city,
            "country": place.country,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "place_type_id": place.place_type_id,
            "is_moderated": place.is_moderated,
            "is_valid": place.is_valid,
            "submitted_by_id": place.submitted_by_id,
            "place_type": place_type_dict,
            "submitted_by": submitted_by_dict,
            "created_at": place.created_at,
            "updated_at": place.updated_at,
            "likes_count": likes_count,
            "is_liked": is_liked
        }
        return PlaceResponse(**place_data)

    def _create_public_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PublicPlaceResponse:
        """Create a PublicPlaceResponse from a Place model"""
        # Create place_type dictionary
        place_type_dict = {
            "id": place.place_type.id,
            "name": place.place_type.name
        } if place.place_type else None
        
        # Create response with all required fields
        place_data = {
            "id": place.id,
            "name": place.name,
            "description": place.description,
            "address": place.address,
            "city": place.city,
            "country": place.country,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "place_type": place_type_dict,
            "created_at": place.created_at,
            "updated_at": place.updated_at,
            "likes_count": likes_count,
            "is_liked": is_liked
        }
        return PublicPlaceResponse(**place_data)

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
        query = select(PlaceType).filter(PlaceType.name == place_type_name)
        result = await self.repository.db.execute(query)
        place_type = result.scalar_one_or_none()
        
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
                
                response_places.append(self._create_place_response(place, likes_count, is_liked))
            
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