from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, func, case
from sqlalchemy.orm import selectinload

from app.models.place_model import Place
from app.models.place_like_model import PlaceLike
from app.core.exceptions import ResourceNotFoundError
from app.core.transaction import TransactionalMixin


class PlaceRepository(TransactionalMixin):
    """Repository for place-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_places(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Place]:
        """Get all places with optional pagination."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(Place.is_valid.is_(True))

        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_all_moderated_places(self) -> int:
        """Count all moderated places."""
        query = select(func.count(Place.id)).filter(
            and_(Place.is_valid.is_(True), Place.is_moderated.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_all_moderated_places(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Place]:
        """Get all moderated places with optional pagination."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.is_valid.is_(True), Place.is_moderated.is_(True))
        ).order_by(Place.name)

        if offset is not None and offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_map_places(self) -> List[tuple]:
        """Get all moderated places with coordinates for map markers. Grouping by country+city is done client-side."""
        query = select(
            Place.id,
            Place.latitude,
            Place.longitude,
            Place.city,
            Place.country
        ).filter(
            and_(
                Place.is_valid.is_(True),
                Place.is_moderated.is_(True),
                Place.latitude.isnot(None),
                Place.longitude.isnot(None)
            )
        )

        result = await self.db.execute(query)
        return result.all()

    async def get_places_by_location(self, country: str, city: str) -> List[Place]:
        """Get all moderated places in the given country and city."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid.is_(True),
                Place.is_moderated.is_(True),
                Place.country == country,
                Place.city == city,
            )
        ).order_by(Place.name)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_place_by_id(self, place_id: int) -> Place:
        """Get a place by its ID."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.id == place_id, Place.is_valid.is_(True))
        )
        result = await self.db.execute(query)
        place = result.scalar_one_or_none()

        if not place:
            raise ResourceNotFoundError("Place", place_id)

        return place

    async def get_place_by_id_internal(self, place_id: int) -> Optional[Place]:
        """Get place by ID with relations, without is_valid filter (internal use only)."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(Place.id == place_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_moderated_place_by_id(self, place_id: int) -> Place:
        """Get a moderated place by its ID."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.id == place_id, Place.is_valid.is_(True), Place.is_moderated.is_(True))
        )
        result = await self.db.execute(query)
        place = result.scalar_one_or_none()

        if not place:
            raise ResourceNotFoundError("Place", place_id)

        return place

    async def create_place(self, place_data: dict) -> Place:
        """Create a new place without committing (transaction managed by service)."""
        place = Place(**place_data)
        await self._add_entity(place, flush=True)  # Flush to get the ID
        await self._refresh_entity(place)
        return place

    async def update_place(self, place_id: int, place_data: dict) -> Place:
        """Update an existing place without committing (transaction managed by service)."""
        place = await self.get_place_by_id(place_id)

        for key, value in place_data.items():
            if hasattr(place, key):
                setattr(place, key, value)

        # Flush to ensure changes are persisted
        await self._add_entity(place, flush=True)
        await self._refresh_entity(place)
        return place

    async def delete_place(self, place_id: int) -> bool:
        """Soft delete a place by setting is_valid to False without committing (transaction managed by service)."""
        place = await self.get_place_by_id(place_id)
        place.is_valid = False
        await self._add_entity(place)
        return True

    async def get_places_by_user(self, user_id: int) -> List[Place]:
        """Get all places submitted by a specific user."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_moderated_places_by_user(self, user_id: int) -> List[Place]:
        """Get all moderated places submitted by a specific user."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.submitted_by_id == user_id,
                 Place.is_valid.is_(True), Place.is_moderated.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_places_by_user(self, user_id: int) -> int:
        """Count all places submitted by a specific user."""
        query = select(func.count(Place.id)).filter(
            and_(Place.submitted_by_id == user_id, Place.is_valid.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def count_moderated_places_by_user(self, user_id: int) -> int:
        """Count all moderated places submitted by a specific user."""
        query = select(func.count(Place.id)).filter(
            and_(Place.submitted_by_id == user_id,
                 Place.is_valid.is_(True), Place.is_moderated.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def count_moderated_places_by_type(self, place_type_id: int) -> int:
        """Count all moderated places of a specific type."""
        query = select(func.count(Place.id)).filter(
            and_(Place.place_type_id == place_type_id,
                 Place.is_valid.is_(True), Place.is_moderated.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_moderated_places_by_type(
        self, place_type_id: int, limit: Optional[int] = None, offset: Optional[int] = None
    ) -> List[Place]:
        """Get all moderated places of a specific type."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(Place.place_type_id == place_type_id,
                 Place.is_valid.is_(True), Place.is_moderated.is_(True))
        ).order_by(Place.name)
        if offset is not None and offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_moderated_places_by_search(self, search_term: str) -> int:
        """Count moderated places matching a search term."""
        query = select(func.count(Place.id)).filter(
            and_(
                Place.is_valid.is_(True),
                Place.is_moderated.is_(True),
                or_(
                    Place.name.ilike(f"%{search_term}%"),
                    Place.city.ilike(f"%{search_term}%"),
                    Place.country.ilike(f"%{search_term}%")
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def search_moderated_places(
        self, search_term: str, limit: Optional[int] = None, offset: Optional[int] = None
    ) -> List[Place]:
        """Search moderated places by name, city, or country."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid.is_(True),
                Place.is_moderated.is_(True),
                or_(
                    Place.name.ilike(f"%{search_term}%"),
                    Place.city.ilike(f"%{search_term}%"),
                    Place.country.ilike(f"%{search_term}%")
                )
            )
        ).order_by(Place.name)
        if offset is not None and offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_moderated_places_in_region(
        self, min_lat: float, max_lat: float, min_lng: float, max_lng: float
    ) -> int:
        """Count moderated places within a geographic region."""
        query = select(func.count(Place.id)).filter(
            and_(
                Place.is_valid.is_(True),
                Place.is_moderated.is_(True),
                Place.latitude >= min_lat,
                Place.latitude <= max_lat,
                Place.longitude >= min_lng,
                Place.longitude <= max_lng
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_moderated_places_in_region(
        self,
        min_lat: float, max_lat: float, min_lng: float, max_lng: float,
        limit: Optional[int] = None, offset: Optional[int] = None
    ) -> List[Place]:
        """Get moderated places within a geographic region."""
        query = select(Place).options(
            selectinload(Place.place_type),
            selectinload(Place.submitted_by)
        ).filter(
            and_(
                Place.is_valid.is_(True),
                Place.is_moderated.is_(True),
                Place.latitude >= min_lat,
                Place.latitude <= max_lat,
                Place.longitude >= min_lng,
                Place.longitude <= max_lng
            )
        ).order_by(Place.name)
        if offset is not None and offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def like_place(self, user_id: int, place_id: int) -> PlaceLike:
        """Like a place for a user without committing (transaction managed by service)."""
        like = PlaceLike(user_id=user_id, place_id=place_id)
        await self._add_entity(like, flush=True)
        await self._refresh_entity(like)
        return like

    async def unlike_place(self, user_id: int, place_id: int) -> bool:
        """Unlike a place for a user without committing (transaction managed by service)."""
        query = select(PlaceLike).filter(
            and_(PlaceLike.user_id == user_id, PlaceLike.place_id == place_id)
        )
        result = await self.db.execute(query)
        like = result.scalar_one_or_none()
        if not like:
            return False
        await self._delete_entity(like)
        return True

    async def get_place_likes_count(self, place_id: int) -> int:
        """Get the number of likes for a place."""
        query = select(func.count(PlaceLike.id)).filter(
            PlaceLike.place_id == place_id)
        result = await self.db.execute(query)
        return result.scalar()

    async def get_places_likes_info_batch(self, user_id: Optional[int], place_ids: List[int]) -> dict:
        """Get both likes counts and user likes status in a single optimized query."""
        if not place_ids:
            return {'counts': {}, 'user_likes': {}}

        # Single query with aggregation: counts and user like status
        query = select(
            PlaceLike.place_id,
            func.count(PlaceLike.id).label('count'),
            func.max(case((PlaceLike.user_id == user_id, 1), else_=0)).label('is_liked')
        ).filter(
            PlaceLike.place_id.in_(place_ids)
        ).group_by(PlaceLike.place_id)

        result = await self.db.execute(query)
        rows = result.all()

        # Build dictionaries
        counts = {}
        user_likes = {}

        for row in rows:
            place_id = row.place_id
            counts[place_id] = row.count
            user_likes[place_id] = bool(row.is_liked) if user_id else False

        # Ensure all place_ids have entries (even if 0)
        for place_id in place_ids:
            if place_id not in counts:
                counts[place_id] = 0
            if place_id not in user_likes:
                user_likes[place_id] = False

        return {'counts': counts, 'user_likes': user_likes}

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
            and_(PlaceLike.user_id == user_id, Place.is_valid.is_(True))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_moderation_status_by_name(self, status_name: str):
        """Get moderation status by name."""
        from app.models.reference_data.moderation_statuses import ModerationStatus
        query = select(ModerationStatus).filter(
            ModerationStatus.name == status_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_place_type_by_id(self, place_type_id: int):
        """Get a place type by ID."""
        from app.models.reference_data.place_types import PlaceType
        result = await self.db.execute(
            select(PlaceType).filter(PlaceType.id == place_type_id)
        )
        return result.scalar_one_or_none()

    async def get_all_place_types(self) -> List:
        """Get all place types."""
        from app.models.reference_data.place_types import PlaceType
        result = await self.db.execute(select(PlaceType))
        return result.scalars().all()
