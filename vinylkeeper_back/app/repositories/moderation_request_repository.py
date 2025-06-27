from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.moderation_request_model import ModerationRequest
from app.models.place_model import Place
from app.models.reference_data.moderation_statuses import ModerationStatus
from app.core.enums import ModerationStatusEnum


class ModerationRequestRepository:
    """Repository for moderation request operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_all_moderation_requests(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ModerationRequest]:
        """Get all moderation requests with optional pagination."""
        query = self.db.query(ModerationRequest).order_by(ModerationRequest.created_at.desc())
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
            
        return query.all()

    def get_moderation_request_by_id(self, request_id: int) -> Optional[ModerationRequest]:
        """Get a moderation request by ID."""
        return self.db.query(ModerationRequest).filter(ModerationRequest.id == request_id).first()

    def get_moderation_requests_by_status(self, status_name: str, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ModerationRequest]:
        """Get moderation requests by status."""
        query = self.db.query(ModerationRequest).join(ModerationStatus).filter(
            ModerationStatus.name == status_name
        ).order_by(ModerationRequest.created_at.desc())
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
            
        return query.all()

    def get_pending_moderation_requests(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[ModerationRequest]:
        """Get pending moderation requests."""
        return self.get_moderation_requests_by_status(ModerationStatusEnum.PENDING.value, limit, offset)

    def create_moderation_request(self, request_data: dict) -> ModerationRequest:
        """Create a new moderation request."""
        moderation_request = ModerationRequest(**request_data)
        self.db.add(moderation_request)
        self.db.commit()
        self.db.refresh(moderation_request)
        return moderation_request

    def update_moderation_request(self, request_id: int, update_data: dict) -> Optional[ModerationRequest]:
        """Update a moderation request."""
        moderation_request = self.get_moderation_request_by_id(request_id)
        if not moderation_request:
            return None
            
        for key, value in update_data.items():
            setattr(moderation_request, key, value)
            
        self.db.commit()
        self.db.refresh(moderation_request)
        return moderation_request

    def delete_moderation_request(self, request_id: int) -> bool:
        """Delete a moderation request."""
        moderation_request = self.get_moderation_request_by_id(request_id)
        if not moderation_request:
            return False
            
        self.db.delete(moderation_request)
        self.db.commit()
        return True

    def get_moderation_request_count_by_status(self, status_name: str) -> int:
        """Get count of moderation requests by status."""
        return self.db.query(ModerationRequest).join(ModerationStatus).filter(
            ModerationStatus.name == status_name
        ).count()

    def get_total_moderation_request_count(self) -> int:
        """Get total count of moderation requests."""
        return self.db.query(ModerationRequest).count()

    def get_moderation_request_stats(self) -> dict:
        """Get moderation request statistics."""
        return {
            "total": self.get_total_moderation_request_count(),
            "pending": self.get_moderation_request_count_by_status(ModerationStatusEnum.PENDING.value),
            "approved": self.get_moderation_request_count_by_status(ModerationStatusEnum.APPROVED.value),
            "rejected": self.get_moderation_request_count_by_status(ModerationStatusEnum.REJECTED.value),
        } 