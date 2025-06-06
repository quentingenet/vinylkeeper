from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Table,
    event,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError

from app.db.base import Base
from app.models.association_tables import ( 
    collection_album,
    collection_artist,
)


class Collection(Base):
    """Model representing a vinyl collection."""

    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)

    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    owner = relationship(
        "User",
        back_populates="collections",
        lazy="selectin"
    )

    # Relations many-to-many optimisées
    albums = relationship(
        "Album",
        secondary=collection_album,
        back_populates="collections",
        lazy="selectin"
    )
    artists = relationship(
        "Artist",
        secondary=collection_artist,
        back_populates="collections",
        lazy="selectin"
    )

    # Relation many-to-many pour les likes
    liked_by = relationship(
        "User",
        secondary="collection_likes",
        back_populates="liked_collections",
        lazy="selectin"
    )

    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Contraintes de validation
    __table_args__ = (
        CheckConstraint(
            "length(name) >= 1",
            name="check_collection_name_length"
        ),
    )

    @validates('name')
    def validate_name(self, key, name):
        """Validate collection name."""
        if not name or len(name.strip()) == 0:
            raise ValueError("Collection name cannot be empty")
        return name.strip()

    @validates('description')
    def validate_description(self, key, description):
        """Validate collection description."""
        if description is not None and len(description) > 255:
            raise ValueError("Description cannot be longer than 255 characters")
        return description

    def __repr__(self):
        """String representation of the collection."""
        return f"<Collection(name={self.name}, owner_id={self.owner_id})>"


# Event listeners
@event.listens_for(Collection, 'before_insert')
def set_timestamps(mapper, connection, target):
    """Set timestamps before insertion."""
    now = func.now()
    target.registered_at = now
    target.updated_at = now


@event.listens_for(Collection, 'before_update')
def update_timestamp(mapper, connection, target):
    """Update timestamp before update."""
    target.updated_at = func.now()
