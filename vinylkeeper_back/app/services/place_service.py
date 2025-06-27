from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, NoResultFound

from app.repositories.place_repository import PlaceRepository
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


class PlaceService:
    """Service for managing places"""

    def __init__(self, repository: PlaceRepository):
        self.repository = repository

    async def create_place(self, place_data: PlaceCreate, user_id: int) -> PlaceResponse:
        """Create a new place and automatically create a moderation request"""
        try:
            # Validate place data
            self._validate_place_data(place_data)
            
            # Get place type ID from name
            place_type_id = self._get_place_type_id_by_name(place_data.place_type_id)
            
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
            created_place = self.repository.create_place(place_dict)
            
            # Create moderation request automatically
            moderation_request = self._create_moderation_request(created_place.id, user_id)
            
            # Get user info for email
            user = self.repository.db.query(User).filter(User.id == user_id).first()
            
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
            likes_count = self.repository.get_place_likes_count(created_place.id)
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

    def get_place(self, place_id: int, user_id: Optional[int] = None) -> PublicPlaceResponse:
        """Get a place by ID (only moderated places)."""
        try:
            place = self.repository.get_moderated_place_by_id(place_id)
            
            # Get likes info
            likes_count = self.repository.get_place_likes_count(place_id)
            is_liked = False
            if user_id:
                is_liked = self.repository.is_place_liked_by_user(user_id, place_id)
            
            return self._create_public_place_response(place, likes_count, is_liked)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get place",
                details={"error": str(e)}
            )

    def get_all_places(self, user_id: Optional[int] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get all places with optional pagination (only moderated places)."""
        try:
            places = self.repository.get_all_moderated_places(limit, offset)
            
            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = self.repository.is_place_liked_by_user(user_id, place.id)
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get places",
                details={"error": str(e)}
            )

    def update_place(self, user_id: int, place_id: int, place_data: PlaceUpdate) -> PlaceResponse:
        """Update an existing place"""
        try:
            place = self.repository.get_place_by_id(place_id)
            
            # Check if user can update this place (owner or admin)
            if place.submitted_by_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to update this place"
                )

            # Update place
            update_dict = place_data.model_dump(exclude_unset=True)
            updated_place = self.repository.update_place(place_id, update_dict)
            
            # Get likes info
            likes_count = self.repository.get_place_likes_count(place_id)
            is_liked = self.repository.is_place_liked_by_user(user_id, place_id)
            
            return self._create_place_response(updated_place, likes_count, is_liked)
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to update place",
                details={"error": str(e)}
            )

    def delete_place(self, user_id: int, place_id: int) -> bool:
        """Soft delete a place"""
        try:
            place = self.repository.get_place_by_id(place_id)
            
            # Check if user can delete this place (owner or admin)
            if place.submitted_by_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to delete this place"
                )

            return self.repository.delete_place(place_id)
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to delete place",
                details={"error": str(e)}
            )

    def like_place(self, user_id: int, place_id: int) -> dict:
        """Like a place"""
        try:
            # Verify place exists
            self.repository.get_place_by_id(place_id)
            
            # Like the place
            self.repository.like_place(user_id, place_id)
            
            # Get updated likes count
            likes_count = self.repository.get_place_likes_count(place_id)
            
            return {
                "message": "Place liked successfully",
                "likes_count": likes_count,
                "is_liked": True,
                "liked": True
            }
        except (ResourceNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to like place",
                details={"error": str(e)}
            )

    def unlike_place(self, user_id: int, place_id: int) -> dict:
        """Unlike a place"""
        try:
            # Verify place exists
            self.repository.get_place_by_id(place_id)
            
            # Unlike the place
            self.repository.unlike_place(user_id, place_id)
            
            # Get updated likes count
            likes_count = self.repository.get_place_likes_count(place_id)
            
            return {
                "message": "Place unliked successfully",
                "likes_count": likes_count,
                "is_liked": False,
                "liked": False
            }
        except (ResourceNotFoundError, ValidationError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to unlike place",
                details={"error": str(e)}
            )

    def search_places(self, search_term: str, user_id: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Search places by name, city, or country (only moderated places)."""
        try:
            places = self.repository.search_moderated_places(search_term)
            
            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = self.repository.is_place_liked_by_user(user_id, place.id)
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to search places",
                details={"error": str(e)}
            )

    def get_places_by_type(self, place_type_id: int, user_id: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get all places of a specific type (only moderated places)."""
        try:
            places = self.repository.get_moderated_places_by_type(place_type_id)
            
            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = self.repository.is_place_liked_by_user(user_id, place.id)
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get places by type",
                details={"error": str(e)}
            )

    def get_places_in_region(self, min_lat: float, max_lat: float, min_lng: float, max_lng: float, user_id: Optional[int] = None) -> List[PublicPlaceResponse]:
        """Get places within a geographic region (only moderated places)."""
        try:
            places = self.repository.get_moderated_places_in_region(min_lat, max_lat, min_lng, max_lng)
            
            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = self.repository.is_place_liked_by_user(user_id, place.id)
                
                response_places.append(self._create_public_place_response(place, likes_count, is_liked))
            
            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get places in region",
                details={"error": str(e)}
            )

    def _create_moderation_request(self, place_id: int, user_id: int) -> ModerationRequest:
        """Create a moderation request for a place"""
        try:
            # Get pending status
            pending_status = self.repository.db.query(ModerationStatus).filter(
                ModerationStatus.name == ModerationStatusEnum.PENDING.value
            ).first()
            
            if not pending_status:
                raise ValidationError(
                    error_code=4000,
                    message="Pending moderation status not found"
                )
            
            # Create moderation request
            moderation_request = ModerationRequest(
                place_id=place_id,
                user_id=user_id,
                status_id=pending_status.id
            )
            
            self.repository.db.add(moderation_request)
            self.repository.db.commit()
            self.repository.db.refresh(moderation_request)
            
            return moderation_request
        except Exception as e:
            self.repository.db.rollback()
            logger.error(f"Error creating moderation request: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create moderation request",
                details={"error": str(e)}
            )

    def _create_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PlaceResponse:
        """Create a PlaceResponse from a Place model (for admins)."""
        response_data = {
            "id": place.id,
            "name": place.name,
            "address": place.address,
            "city": place.city,
            "country": place.country,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "description": place.description,
            "source_url": place.source_url,
            "place_type_id": place.place_type_id,
            "submitted_by_id": place.submitted_by_id,
            "is_moderated": place.is_moderated,
            "is_valid": place.is_valid,
            "created_at": place.created_at,
            "updated_at": place.updated_at,
            "likes_count": likes_count,
            "is_liked": is_liked,
            "submitted_by": None,
            "place_type": None
        }
        
        # Add submitted_by info if available
        if place.submitted_by:
            response_data["submitted_by"] = {
                "id": place.submitted_by.id,
                "username": place.submitted_by.username
            }
        
        # Add place_type info if available
        if place.place_type:
            response_data["place_type"] = {
                "id": place.place_type.id,
                "name": place.place_type.name
            }
        
        return PlaceResponse.model_validate(response_data)

    def _create_public_place_response(self, place: Place, likes_count: int, is_liked: bool) -> PublicPlaceResponse:
        """Create a PublicPlaceResponse from a Place model (for public users)."""
        response_data = {
            "id": place.id,
            "name": place.name,
            "address": place.address,
            "city": place.city,
            "country": place.country,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "description": place.description,
            "source_url": place.source_url,
            "likes_count": likes_count,
            "is_liked": is_liked,
            "created_at": place.created_at,
            "updated_at": place.updated_at,
            "place_type": None
        }
        
        # Add place_type info if available
        if place.place_type:
            response_data["place_type"] = {
                "id": place.place_type.id,
                "name": place.place_type.name
            }
        
        return PublicPlaceResponse.model_validate(response_data)

    def _validate_place_data(self, data: PlaceCreate) -> None:
        """Validate place creation data"""
        if not data.name or len(data.name.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="Place name cannot be empty"
            )
        
        # Only validate coordinates if they are provided
        if data.latitude is not None:
            if data.latitude < -90 or data.latitude > 90:
                raise ValidationError(
                    error_code=4000,
                    message="Latitude must be between -90 and 90"
                )
        
        if data.longitude is not None:
            if data.longitude < -180 or data.longitude > 180:
                raise ValidationError(
                    error_code=4000,
                    message="Longitude must be between -180 and 180"
                )

    def _get_place_type_id_by_name(self, place_type_name: str) -> int:
        """Get place type ID from name"""
        place_type = self.repository.db.query(PlaceType).filter(PlaceType.name == place_type_name).first()
        if place_type:
            return place_type.id
        else:
            raise ValidationError(
                error_code=4000,
                message="Place type not found"
            )

    def get_all_places_admin(self, user_id: Optional[int] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[PlaceResponse]:
        """Get all places with optional pagination (for admins - includes non-moderated places)."""
        try:
            places = self.repository.get_all_places(limit, offset)
            
            # Get likes info for each place
            response_places = []
            for place in places:
                likes_count = self.repository.get_place_likes_count(place.id)
                is_liked = False
                if user_id:
                    is_liked = self.repository.is_place_liked_by_user(user_id, place.id)
                
                response_places.append(self._create_place_response(place, likes_count, is_liked))
            
            return response_places
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get places",
                details={"error": str(e)}
            )

    def get_place_admin(self, place_id: int, user_id: Optional[int] = None) -> PlaceResponse:
        """Get a place by ID (for admins - includes non-moderated places)."""
        try:
            place = self.repository.get_place_by_id(place_id)
            
            # Get likes info
            likes_count = self.repository.get_place_likes_count(place_id)
            is_liked = False
            if user_id:
                is_liked = self.repository.is_place_liked_by_user(user_id, place_id)
            
            return self._create_place_response(place, likes_count, is_liked)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get place",
                details={"error": str(e)}
            ) 