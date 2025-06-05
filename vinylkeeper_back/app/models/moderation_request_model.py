from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import ModerationStatusEnum


class ModerationRequest(Base):
    """Model representing a moderation request for a place."""

    __tablename__ = "moderation_requests"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(
        SQLEnum(ModerationStatusEnum, name="moderation_status_enum"),
        nullable=False,
        default=ModerationStatusEnum.pending.value,
    )
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    place = relationship("Place", back_populates="moderation_requests")
