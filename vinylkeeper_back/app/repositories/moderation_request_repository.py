from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.moderation_request_model import ModerationRequest
from app.models.place_model import Place
from app.models.reference_data.moderation_statuses import ModerationStatus
from app.core.enums import ModerationStatusEnum
from app.core.exceptions import ResourceNotFoundError, ServerError


class ModerationRequestRepository:
    """Repository for moderation request-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_requests(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ModerationRequest]:
        """Get all moderation requests with optional pagination."""
        query = select(ModerationRequest)
        query = query.options(
            selectinload(ModerationRequest.place),
            selectinload(ModerationRequest.user),
            selectinload(ModerationRequest.status)
        )
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_requests_by_status(self, status_id: int, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ModerationRequest]:
        """Get moderation requests by status with optional pagination."""
        query = select(ModerationRequest).filter(ModerationRequest.status_id == status_id)
        query = query.options(
            selectinload(ModerationRequest.place),
            selectinload(ModerationRequest.user),
            selectinload(ModerationRequest.status)
        )
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_request_by_id(self, request_id: int) -> ModerationRequest:
        """Get a moderation request by its ID."""
        query = select(ModerationRequest).filter(ModerationRequest.id == request_id)
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
        """Create a new moderation request."""
        request = ModerationRequest(**request_data)
        self.db.add(request)
        await self.db.commit()
        await self.db.refresh(request)
        return request

    async def update_request(self, request_id: int, request_data: dict) -> ModerationRequest:
        """Update an existing moderation request."""
        request = await self.get_request_by_id(request_id)
        
        for key, value in request_data.items():
            if hasattr(request, key):
                setattr(request, key, value)
        
        await self.db.commit()
        await self.db.refresh(request)
        return request

    async def delete_request(self, request_id: int) -> bool:
        """Delete a moderation request."""
        request = await self.get_request_by_id(request_id)
        await self.db.delete(request)
        await self.db.commit()
        return True

    async def get_requests_by_user(self, user_id: int) -> List[ModerationRequest]:
        """Get all moderation requests submitted by a specific user."""
        query = select(ModerationRequest).filter(ModerationRequest.submitted_by_id == user_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_requests_by_entity_type(self, entity_type_id: int) -> List[ModerationRequest]:
        """Get all moderation requests for a specific entity type."""
        query = select(ModerationRequest).filter(ModerationRequest.entity_type_id == entity_type_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_pending_requests_count(self) -> int:
        """Get the count of pending moderation requests."""
        from sqlalchemy import func
        query = select(func.count(ModerationRequest.id)).filter(ModerationRequest.status_id == 1)  # Assuming 1 is pending status
        result = await self.db.execute(query)
        return result.scalar()

    async def get_requests_by_entity_id(self, entity_id: int, entity_type_id: int) -> List[ModerationRequest]:
        """Get moderation requests for a specific entity."""
        query = select(ModerationRequest).filter(
            and_(ModerationRequest.entity_id == entity_id, ModerationRequest.entity_type_id == entity_type_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_moderation_request_stats(self) -> dict:
        """Get moderation request statistics."""
        try:
            from sqlalchemy import func
            
            # Get total count
            total_query = select(func.count(ModerationRequest.id))
            result = await self.db.execute(total_query)
            total = result.scalar()
            
            # Get pending count
            pending_query = select(func.count(ModerationRequest.id)).filter(ModerationRequest.status_id == 1)  # Assuming 1 is pending
            result = await self.db.execute(pending_query)
            pending = result.scalar()
            
            # Get approved count
            approved_query = select(func.count(ModerationRequest.id)).filter(ModerationRequest.status_id == 2)  # Assuming 2 is approved
            result = await self.db.execute(approved_query)
            approved = result.scalar()
            
            # Get rejected count
            rejected_query = select(func.count(ModerationRequest.id)).filter(ModerationRequest.status_id == 3)  # Assuming 3 is rejected
            result = await self.db.execute(rejected_query)
            rejected = result.scalar()
            
            return {
                "total": total,
                "pending": pending,
                "approved": approved,
                "rejected": rejected
            }
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get moderation request stats",
                details={"error": str(e)}
            )

    async def get_moderation_request_count_by_status(self, status_name: str) -> int:
        """Get count of moderation requests by status."""
        from sqlalchemy import func
        query = select(func.count(ModerationRequest.id)).join(ModerationStatus).filter(
            ModerationStatus.name == status_name
        )
        result = await self.db.execute(query)
        return result.scalar()

    async def get_total_moderation_request_count(self) -> int:
        """Get total count of moderation requests."""
        from sqlalchemy import func
        query = select(func.count(ModerationRequest.id))
        result = await self.db.execute(query)
        return result.scalar()

    async def get_moderation_request_stats_sync(self) -> dict:
        """Get moderation request statistics."""
        return {
            "total": await self.get_total_moderation_request_count(),
            "pending": await self.get_moderation_request_count_by_status(ModerationStatusEnum.PENDING.value),
            "approved": await self.get_moderation_request_count_by_status(ModerationStatusEnum.APPROVED.value),
            "rejected": await self.get_moderation_request_count_by_status(ModerationStatusEnum.REJECTED.value),
        } 

    async def get_moderation_status_by_name(self, status_name: str):
        """Get moderation status by name."""
        query = select(ModerationStatus).filter(ModerationStatus.name == status_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() 