from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base


class Like(Base):
    """Like model."""

    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "collection_id",
            name="uq_user_collection_like"
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    collection_id = Column(Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    # raise: a like is read for its ids only; loading its user (and role) and collection cost 3 queries
    user = relationship("User", back_populates="likes", lazy="raise")
    collection = relationship(
        "Collection", back_populates="likes", lazy="raise")

    def __repr__(self):
        return f"<Like(user_id={self.user_id}, collection_id={self.collection_id})>"
