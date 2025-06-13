# app/models/wishlist.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    event,
    func,
)
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.core.enums import EntityTypeEnum


class Wishlist(Base):
    """Wishlist items keyed by Discogs ID and entity type (artist or album)."""
    __tablename__ = "wishlists"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "discogs_id",
            "entity_type",
            name="uq_user_discogs_entity"
        ),
        CheckConstraint(
            "discogs_id ~ '^[0-9]+$'",
            name="ck_wishlist_discogs_id_numeric"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    discogs_id = Column(String(255), nullable=False, index=True)
    entity_type = Column(
        SQLEnum(EntityTypeEnum, name="entitytypeenum"),
        nullable=False,
        index=True
    )
    added_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="wishlist_items",
        lazy="selectin"
    )

    def __repr__(self):
        return (
            f"<Wishlist(user_id={self.user_id}, "
            f"discogs_id={self.discogs_id}, entity_type={self.entity_type})>"
        )


@event.listens_for(Wishlist, "before_insert")
def set_added_at(mapper, connection, target):
    """Initialise added_at at the time of insertion."""
    target.added_at = func.now()
