from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, func
from sqlalchemy.orm import selectinload

from app.models.place_model import Place
from app.models.place_like_model import PlaceLike
from app.core.exceptions import ResourceNotFoundError, ValidationError


class PlaceRepository:
    """Repository for place-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_places(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Place]:
        """Get all places with optional pagination."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(Place.is_valid == True)
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_all_moderated_places(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Place]:
        """Get all moderated places with optional pagination."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.is_valid == True, Place.is_moderated == True)
        )
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_place_by_id(self, place_id: int) -> Place:
        """Get a place by its ID."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.id == place_id, Place.is_valid == True)
        )
        result = await self.db.execute(query)
        place = result.scalar_one_or_none()
        
        if not place:
            raise ResourceNotFoundError("Place", place_id)
        
        return place

    async def get_moderated_place_by_id(self, place_id: int) -> Place:
        """Get a moderated place by its ID."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.id == place_id, Place.is_valid == True, Place.is_moderated == True)
        )
        result = await self.db.execute(query)
        place = result.scalar_one_or_none()
        
        if not place:
            raise ResourceNotFoundError("Place", place_id)
        
        return place

    async def create_place(self, place_data: dict) -> Place:
        """Create a new place."""
        place = Place(**place_data)
        self.db.add(place)
        await self.db.commit()
        await self.db.refresh(place)
        return place

    async def update_place(self, place_id: int, place_data: dict) -> Place:
        """Update an existing place."""
        place = await self.get_place_by_id(place_id)
        
        for key, value in place_data.items():
            if hasattr(place, key):
                setattr(place, key, value)
        
        await self.db.commit()
        await self.db.refresh(place)
        return place

    async def delete_place(self, place_id: int) -> bool:
        """Soft delete a place by setting is_valid to False."""
        place = await self.get_place_by_id(place_id)
        place.is_valid = False
        await self.db.commit()
        return True

    async def get_places_by_user(self, user_id: int) -> List[Place]:
        """Get all places submitted by a specific user."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid == True)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_moderated_places_by_user(self, user_id: int) -> List[Place]:
        """Get all moderated places submitted by a specific user."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid == True, Place.is_moderated == True)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_places_by_user(self, user_id: int) -> int:
        """Count all places submitted by a specific user."""
        query = select(func.count(Place.id)).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid == True)
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def count_moderated_places_by_user(self, user_id: int) -> int:
        """Count all moderated places submitted by a specific user."""
        query = select(func.count(Place.id)).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid == True, Place.is_moderated == True)
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def get_places_by_type(self, place_type_id: int) -> List[Place]:
        """Get all places of a specific type."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.place_type_id == place_type_id, Place.is_valid == True)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_moderated_places_by_type(self, place_type_id: int) -> List[Place]:
        """Get all moderated places of a specific type."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.place_type_id == place_type_id, Place.is_valid == True, Place.is_moderated == True)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def search_places(self, search_term: str) -> List[Place]:
        """Search all places by name, city, or country."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid == True,
                or_(
                    Place.name.ilike(f"%{search_term}%"),
                    Place.city.ilike(f"%{search_term}%"),
                    Place.country.ilike(f"%{search_term}%")
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def search_moderated_places(self, search_term: str) -> List[Place]:
        """Search moderated places by name, city, or country."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid == True,
                Place.is_moderated == True,
                or_(
                    Place.name.ilike(f"%{search_term}%"),
                    Place.city.ilike(f"%{search_term}%"),
                    Place.country.ilike(f"%{search_term}%")
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_places_in_region(self, min_lat: float, max_lat: float, min_lng: float, max_lng: float) -> List[Place]:
        """Get all places within a geographic region."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid == True,
                Place.latitude >= min_lat,
                Place.latitude <= max_lat,
                Place.longitude >= min_lng,
                Place.longitude <= max_lng
            )
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_moderated_places_in_region(self, min_lat: float, max_lat: float, min_lng: float, max_lng: float) -> List[Place]:
        """Get moderated places within a geographic region."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid == True,
                Place.is_moderated == True,
                Place.latitude >= min_lat,
                Place.latitude <= max_lat,
                Place.longitude >= min_lng,
                Place.longitude <= max_lng
            )
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def like_place(self, user_id: int, place_id: int) -> PlaceLike:
        """Like a place for a user."""
        # Check if like already exists
        query = select(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        )
        result = await self.db.execute(query)
        existing_like = result.scalar_one_or_none()
        
        if existing_like:
            raise ValidationError(
                error_code=4000,
                message="User has already liked this place"
            )
        
        like = PlaceLike(user_id=user_id, place_id=place_id)
        self.db.add(like)
        await self.db.commit()
        await self.db.refresh(like)
        return like

    async def unlike_place(self, user_id: int, place_id: int) -> bool:
        """Unlike a place for a user."""
        query = select(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        )
        result = await self.db.execute(query)
        like = result.scalar_one_or_none()
        
        if not like:
            raise ValidationError(
                error_code=4000,
                message="User has not liked this place"
            )
        
        await self.db.delete(like)
        await self.db.commit()
        return True

    async def get_place_likes_count(self, place_id: int) -> int:
        """Get the number of likes for a place."""
        query = select(func.count(PlaceLike.id)).filter(PlaceLike.place_id == place_id)
        result = await self.db.execute(query)
        return result.scalar()

    async def get_places_likes_counts(self, place_ids: List[int]) -> dict:
        """Get likes counts for multiple places in one query."""
        query = select(PlaceLike.place_id, func.count(PlaceLike.id)).filter(
            PlaceLike.place_id.in_(place_ids)
        ).group_by(PlaceLike.place_id)
        
        result = await self.db.execute(query)
        likes_counts = {place_id: count for place_id, count in result.all()}
        
        # Ensure all place_ids have a count (even if 0)
        for place_id in place_ids:
            if place_id not in likes_counts:
                likes_counts[place_id] = 0
                
        return likes_counts

    async def get_user_places_likes(self, user_id: int, place_ids: List[int]) -> dict:
        """Get which places are liked by a user in one query."""
        query = select(PlaceLike.place_id).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id.in_(place_ids))
        )
        
        result = await self.db.execute(query)
        liked_place_ids = {row[0] for row in result.all()}
        
        # Create a dict mapping place_id to is_liked boolean
        return {place_id: place_id in liked_place_ids for place_id in place_ids}

    async def is_place_liked_by_user(self, user_id: int, place_id: int) -> bool:
        """Check if a place is liked by a specific user."""
        query = select(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        )
        result = await self.db.execute(query)
        like = result.scalar_one_or_none()
        return like is not None

    async def get_liked_places_by_user(self, user_id: int) -> List[Place]:
        """Get all places liked by a specific user."""
        query = select(Place).join(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, Place.is_valid == True)
        )
        result = await self.db.execute(query)
        return result.scalars().all() 


    async def get_moderation_status_by_name(self, status_name: str):
        """Get moderation status by name."""
        from app.models.reference_data.moderation_statuses import ModerationStatus
        query = select(ModerationStatus).filter(ModerationStatus.name == status_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_place_type_by_name(self, place_type_name: str):
        """Get place type by name."""
        from app.models.reference_data.place_types import PlaceType
        query = select(PlaceType).filter(PlaceType.name == place_type_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() 

    async def rollback(self):
        """Rollback the current transaction."""
        await self.db.rollback() 