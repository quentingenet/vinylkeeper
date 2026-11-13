from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.moderation_request_model import ModerationRequest
from app.models.place_model import Place
from app.models.reference_data.moderation_statuses import ModerationStatus
from app.core.enums import ModerationStatusEnum
from app.core.exceptions import ResourceNotFoundError
from app.core.transaction import TransactionalMixin


class ModerationRequestRepository(TransactionalMixin):
    """Repository for moderation request-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_requests(
        self, limit: int | None = None, offset: int | None = None
    ) -> List[ModerationRequest]:
        """Get all moderation requests with optional pagination (newest first)."""
        query = select(ModerationRequest).options(
            selectinload(ModerationRequest.place),
            selectinload(ModerationRequest.user),
            selectinload(ModerationRequest.status)
        ).order_by(ModerationRequest.created_at.desc())

        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_requests_by_status(
        self, status_id: int, limit: int | None = None, offset: int | None = None
    ) -> List[ModerationRequest]:
        """Get moderation requests by status with optional pagination (newest first)."""
        query = select(ModerationRequest).filter(
            ModerationRequest.status_id == status_id
        ).options(
            selectinload(ModerationRequest.place),
            selectinload(ModerationRequest.user),
            selectinload(ModerationRequest.status)
        ).order_by(ModerationRequest.created_at.desc())

        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_requests_by_status_id(self, status_id: int) -> int:
        """Get count of moderation requests by status ID."""
        query = select(func.count(ModerationRequest.id)).filter(
            ModerationRequest.status_id == status_id
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def get_request_by_id(self, request_id: int) -> ModerationRequest:
        """Get a moderation request by its ID."""
        query = select(ModerationRequest).filter(
            ModerationRequest.id == request_id)
        query = query.options(
            selectinload(ModerationRequest.place),
            selectinload(ModerationRequest.user),
            selectinload(ModerationRequest.status)
        )
        result = await self.db.execute(query)
        request = result.scalar_one_or_none()

        if not request:
            raise ResourceNotFoundError("ModerationRequest", request_id)

        return request

    async def create_request(self, request_data: dict) -> ModerationRequest:
        """Create a new moderation request without committing (transaction managed by service)."""
        request = ModerationRequest(**request_data)
        await self._add_entity(request, flush=True)
        await self._refresh_entity(request)
        return request

    async def update_request(self, request_id: int, request_data: dict) -> ModerationRequest:
        """Update an existing moderation request without committing (transaction managed by service)."""
        request = await self.get_request_by_id(request_id)

        for key, value in request_data.items():
            if hasattr(request, key):
                setattr(request, key, value)

        await self._add_entity(request, flush=True)
        await self._refresh_entity(request)
        return request

    async def get_moderation_request_stats(self) -> dict:
        """Get moderation request statistics."""
        return {
            "total": await self.get_total_moderation_request_count(),
            "pending": await self.get_moderation_request_count_by_status(ModerationStatusEnum.PENDING.value),
            "approved": await self.get_moderation_request_count_by_status(ModerationStatusEnum.APPROVED.value),
            "rejected": await self.get_moderation_request_count_by_status(ModerationStatusEnum.REJECTED.value),
        }

    async def get_moderation_request_count_by_status(self, status_name: str) -> int:
        """
        Get count of moderation requests by status. Approved counts only the spots still on the map:
        a spot an admin removed later keeps its approved request, for the history.
        """

        query = select(func.count(ModerationRequest.id)).join(ModerationStatus).filter(
            ModerationStatus.name == status_name
        )
        if status_name == ModerationStatusEnum.APPROVED.value:
            query = query.join(Place, Place.id == ModerationRequest.place_id).filter(Place.is_valid.is_(True))
        result = await self.db.execute(query)
        return result.scalar()

    async def get_total_moderation_request_count(self) -> int:
        """Get total count of moderation requests."""

        query = select(func.count(ModerationRequest.id))
        result = await self.db.execute(query)
        return result.scalar()

    async def get_moderation_status_by_name(self, status_name: str):
        """Get moderation status by name."""
        query = select(ModerationStatus).filter(
            ModerationStatus.name == status_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
