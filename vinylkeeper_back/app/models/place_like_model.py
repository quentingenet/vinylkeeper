from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base


class PlaceLike(Base):
    """PlaceLike model."""

    __tablename__ = "place_likes"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "place_id",
            name="uq_user_place_like"
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # raise: a like of a spot is read for its ids only, never for its user or its spot
    user = relationship("User", back_populates="place_likes", lazy="raise")
    place = relationship("Place", back_populates="likes", lazy="raise")

    def __repr__(self):
        return f"<PlaceLike(user_id={self.user_id}, place_id={self.place_id})>"
