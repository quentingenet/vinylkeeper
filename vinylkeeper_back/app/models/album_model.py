from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    event,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates

from app.models.base import Base


class Album(Base):
    """Album model."""

    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    release_year = Column(Integer, nullable=True)
    genre = Column(String(100), nullable=True)
    label = Column(String(100), nullable=True)
    cover_url = Column(String(255), nullable=True)
    owner_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    registered_at = Column(DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    release_id = Column(String(36), unique=True, nullable=False, index=True)
    __table_args__ = (
        CheckConstraint("length(title) >= 1", name="check_album_title_length"),
    )

    owner = relationship("User", back_populates="albums")
    collections = relationship(
        "Collection", secondary="collection_album", back_populates="albums", lazy="selectin")
    artists = relationship("Artist", secondary="album_artist",
                           back_populates="albums", lazy="selectin")
    wishlist_items = relationship(
        "Wishlist",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    loans = relationship(
        "Loan",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    @validates('title')
    def validate_title(self, key, title):
        if not title or len(title.strip()) == 0:
            raise ValueError("Album title cannot be empty")
        return title.strip()

    def __repr__(self):
        return f"<Album(title={self.title}, owner_id={self.owner_id})>"


# Event listeners
@event.listens_for(Album, 'before_insert')
def set_timestamps(mapper, connection, target):
    now = func.now()
    target.registered_at = now
    target.updated_at = now


@event.listens_for(Album, 'before_update')
def update_timestamp(mapper, connection, target):
    target.updated_at = func.now()
