from datetime import datetime
from sqlalchemy import Column, ForeignKey, Integer, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class CollectionLike(Base):
    """Model representing a like on a collection by a user."""

    __tablename__ = "collection_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    collection_id = Column(
        Integer,
        ForeignKey("collections.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    user = relationship("User", back_populates="liked_collections")
    collection = relationship("Collection", back_populates="liked_by")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "collection_id",
            name="uix_user_collection_like"
        ),
    ) 