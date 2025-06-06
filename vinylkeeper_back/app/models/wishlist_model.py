from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    event,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError

from app.db.base import Base


class Wishlist(Base):
    """Model representing a user's wishlist item (album or artist)."""

    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    album_id = Column(
        Integer,
        ForeignKey("albums.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    artist_id = Column(
        Integer,
        ForeignKey("artists.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    added_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relations optimisées
    user = relationship(
        "User",
        back_populates="wishlist_items",
        lazy="selectin"
    )
    album = relationship(
        "Album",
        back_populates="wishlist_items",
        lazy="selectin"
    )
    artist = relationship(
        "Artist",
        back_populates="wishlist_items",
        lazy="selectin"
    )

    # Contraintes de validation
    __table_args__ = (
        CheckConstraint(
            "(album_id IS NOT NULL AND artist_id IS NULL) OR (album_id IS NULL AND artist_id IS NOT NULL)",
            name="check_wishlist_item_type"
        ),
    )

    @validates('album_id', 'artist_id')
    def validate_item_type(self, key, value):
        """Validate that either album_id or artist_id is set, but not both."""
        if key == 'album_id' and value is not None and self.artist_id is not None:
            raise ValueError("Cannot set both album_id and artist_id")
        if key == 'artist_id' and value is not None and self.album_id is not None:
            raise ValueError("Cannot set both album_id and artist_id")
        return value

    def __repr__(self):
        """String representation of the wishlist item."""
        item_type = "Album" if self.album_id else "Artist"
        item_id = self.album_id or self.artist_id
        return f"<Wishlist(user_id={self.user_id}, {item_type}_id={item_id})>"


# Event listeners
@event.listens_for(Wishlist, 'before_insert')
def validate_wishlist_item(mapper, connection, target):
    """Validate wishlist item before insertion."""
    if target.album_id is None and target.artist_id is None:
        raise ValueError("Either album_id or artist_id must be set")
    if target.album_id is not None and target.artist_id is not None:
        raise ValueError("Cannot set both album_id and artist_id")
