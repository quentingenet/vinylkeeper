from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.place_model import Place
from app.models.place_like_model import PlaceLike
from app.core.exceptions import ResourceNotFoundError, ValidationError


class PlaceRepository:
    """Repository for place-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_all_places(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Place]:
        """Get all places with optional pagination."""
        query = self.db.query(Place).filter(Place.is_valid == True)
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
            
        return query.all()

    def get_all_moderated_places(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Place]:
        """Get all moderated places with optional pagination."""
        query = self.db.query(Place).filter(
            and_(Place.is_valid == True, Place.is_moderated == True)
        )
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
            
        return query.all()

    def get_place_by_id(self, place_id: int) -> Place:
        """Get a place by its ID."""
        place = self.db.query(Place).filter(
            and_(Place.id == place_id, Place.is_valid == True)
        ).first()
        
        if not place:
            raise ResourceNotFoundError("Place", place_id)
        
        return place

    def get_moderated_place_by_id(self, place_id: int) -> Place:
        """Get a moderated place by its ID."""
        place = self.db.query(Place).filter(
            and_(Place.id == place_id, Place.is_valid == True, Place.is_moderated == True)
        ).first()
        
        if not place:
            raise ResourceNotFoundError("Place", place_id)
        
        return place

    def create_place(self, place_data: dict) -> Place:
        """Create a new place."""
        place = Place(**place_data)
        self.db.add(place)
        self.db.commit()
        self.db.refresh(place)
        return place

    def update_place(self, place_id: int, place_data: dict) -> Place:
        """Update an existing place."""
        place = self.get_place_by_id(place_id)
        
        for key, value in place_data.items():
            if hasattr(place, key):
                setattr(place, key, value)
        
        self.db.commit()
        self.db.refresh(place)
        return place

    def delete_place(self, place_id: int) -> bool:
        """Soft delete a place by setting is_valid to False."""
        place = self.get_place_by_id(place_id)
        place.is_valid = False
        self.db.commit()
        return True

    def get_places_by_user(self, user_id: int) -> List[Place]:
        """Get all places submitted by a specific user."""
        return self.db.query(Place).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid == True)
        ).all()

    def get_moderated_places_by_user(self, user_id: int) -> List[Place]:
        """Get all moderated places submitted by a specific user."""
        return self.db.query(Place).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid == True, Place.is_moderated == True)
        ).all()

    def get_places_by_type(self, place_type_id: int) -> List[Place]:
        """Get all places of a specific type."""
        return self.db.query(Place).filter(
            and_(Place.place_type_id == place_type_id, Place.is_valid == True)
        ).all()

    def get_moderated_places_by_type(self, place_type_id: int) -> List[Place]:
        """Get all moderated places of a specific type."""
        return self.db.query(Place).filter(
            and_(Place.place_type_id == place_type_id, Place.is_valid == True, Place.is_moderated == True)
        ).all()

    def search_places(self, search_term: str) -> List[Place]:
        """Search all places by name, city, or country."""
        return self.db.query(Place).filter(
            and_(
                Place.is_valid == True,
                or_(
                    Place.name.ilike(f"%{search_term}%"),
                    Place.city.ilike(f"%{search_term}%"),
                    Place.country.ilike(f"%{search_term}%")
                )
            )
        ).all()

    def search_moderated_places(self, search_term: str) -> List[Place]:
        """Search moderated places by name, city, or country."""
        return self.db.query(Place).filter(
            and_(
                Place.is_valid == True,
                Place.is_moderated == True,
                or_(
                    Place.name.ilike(f"%{search_term}%"),
                    Place.city.ilike(f"%{search_term}%"),
                    Place.country.ilike(f"%{search_term}%")
                )
            )
        ).all()

    def get_places_in_region(self, min_lat: float, max_lat: float, min_lng: float, max_lng: float) -> List[Place]:
        """Get all places within a geographic region."""
        return self.db.query(Place).filter(
            and_(
                Place.is_valid == True,
                Place.latitude >= min_lat,
                Place.latitude <= max_lat,
                Place.longitude >= min_lng,
                Place.longitude <= max_lng
            )
        ).all()

    def get_moderated_places_in_region(self, min_lat: float, max_lat: float, min_lng: float, max_lng: float) -> List[Place]:
        """Get moderated places within a geographic region."""
        return self.db.query(Place).filter(
            and_(
                Place.is_valid == True,
                Place.is_moderated == True,
                Place.latitude >= min_lat,
                Place.latitude <= max_lat,
                Place.longitude >= min_lng,
                Place.longitude <= max_lng
            )
        ).all()

    def like_place(self, user_id: int, place_id: int) -> PlaceLike:
        """Like a place for a user."""
        # Check if like already exists
        existing_like = self.db.query(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        ).first()
        
        if existing_like:
            raise ValidationError(
                error_code=4000,
                message="User has already liked this place"
            )
        
        like = PlaceLike(user_id=user_id, place_id=place_id)
        self.db.add(like)
        self.db.commit()
        self.db.refresh(like)
        return like

    def unlike_place(self, user_id: int, place_id: int) -> bool:
        """Unlike a place for a user."""
        like = self.db.query(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        ).first()
        
        if not like:
            raise ValidationError(
                error_code=4000,
                message="User has not liked this place"
            )
        
        self.db.delete(like)
        self.db.commit()
        return True

    def get_place_likes_count(self, place_id: int) -> int:
        """Get the number of likes for a place."""
        return self.db.query(PlaceLike).filter(PlaceLike.place_id == place_id).count()

    def is_place_liked_by_user(self, user_id: int, place_id: int) -> bool:
        """Check if a place is liked by a specific user."""
        like = self.db.query(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        ).first()
        return like is not None

    def get_liked_places_by_user(self, user_id: int) -> List[Place]:
        """Get all places liked by a specific user."""
        return self.db.query(Place).join(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, Place.is_valid == True)
        ).all() 