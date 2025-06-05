from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates

from app.models.base import Base
from app.models.association_tables import collection_artist


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)

    mood_id = Column(Integer, ForeignKey("moods.id"), nullable=True)
    mood = relationship("Mood", back_populates="collections", lazy="selectin")

    owner_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    owner = relationship("User", back_populates="collections", lazy="selectin")

    collection_albums = relationship(
        "CollectionAlbum",
        back_populates="collection",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    artists = relationship(
        "Artist",
        secondary=collection_artist,
        back_populates="collections",
        lazy="selectin"
    )

    likes = relationship(
        "Like",
        back_populates="collection",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "length(name) >= 1",
            name="check_collection_name_length"
        ),
    )

    @validates('name')
    def validate_name(self, key, name):
        if not name or len(name.strip()) == 0:
            raise ValueError("Collection name cannot be empty")
        return name.strip()

    @validates('description')
    def validate_description(self, key, description):
        if description is not None and len(description) > 255:
            raise ValueError(
                "Description cannot be longer than 255 characters")
        return description

    def __repr__(self):
        return f"<Collection(name={self.name}, owner_id={self.owner_id}, mood={self.mood.name if self.mood else 'None'})>"
