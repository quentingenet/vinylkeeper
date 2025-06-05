from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, event, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class ModerationRequest(Base):
    """ModerationRequest model."""

    __tablename__ = "moderation_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    place_id = Column(Integer, ForeignKey(
        "places.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending")
    submitted_at = Column(DateTime(timezone=True),
                          server_default=func.now(), nullable=False)

    user = relationship("User", lazy="selectin")
    place = relationship(
        "Place",
        back_populates="moderation_requests",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<ModerationRequest(user_id={self.user_id}, target_type={self.target_type}, target_id={self.target_id})>"


@event.listens_for(ModerationRequest, 'before_insert')
def set_created_at(mapper, connection, target):
    target.created_at = func.now()
