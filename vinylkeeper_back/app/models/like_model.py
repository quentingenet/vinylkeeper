from sqlalchemy import Column, Integer, ForeignKey, DateTime, event, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class Like(Base):
    """Like model."""

    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    collection_id = Column(Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    user = relationship("User", lazy="selectin")
    collection = relationship("Collection", lazy="selectin")

    def __repr__(self):
        return f"<Like(user_id={self.user_id}, collection_id={self.collection_id})>"


@event.listens_for(Like, 'before_insert')
def set_created_at(mapper, connection, target):
    target.created_at = func.now()
