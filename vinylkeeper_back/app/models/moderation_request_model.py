from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from app.models.base import Base


class ModerationRequest(Base):
    """ModerationRequest model."""

    __tablename__ = "moderation_requests"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status_id = Column(Integer, ForeignKey(
        "moderation_statuses.id"), nullable=False)

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True),
                          server_default=func.now(), nullable=False)

    place = relationship(
        "Place", back_populates="moderation_requests", lazy="selectin")
    user = relationship(
        "User", back_populates="moderation_requests", lazy="selectin")
    status = relationship(
        "ModerationStatus", back_populates="moderation_requests", lazy="selectin")

    def __repr__(self):
        return f"<ModerationRequest(user_id={self.user_id}, place_id={self.place_id}, status={self.status.name})>"
