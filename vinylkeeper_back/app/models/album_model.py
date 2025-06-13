from sqlalchemy import (
    Column,
    Integer,
    Enum as SQLEnum,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.core.enums import StateEnum, MoodEnum
from app.models.association_tables import album_artist


class Album(Base):
    __table_args__ = (
        UniqueConstraint(
            "discogs_album_id",
            name="uq_discogs_album_id",
        ),
    )

    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)

    discogs_album_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="Discogs Album ID as string",
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    state_record = Column(
        SQLEnum(StateEnum, name="stateenum"),
        nullable=True,
    )
    state_cover = Column(
        SQLEnum(StateEnum, name="stateenum"),
        nullable=True,
    )
    mood = Column(
        SQLEnum(MoodEnum, name="moodenum"),
        nullable=True,
    )

    acquisition_date = Column(DateTime, nullable=True)
    purchase_price = Column(Integer, nullable=True)

    registered_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # relationships
    owner = relationship("User", back_populates="albums")
    collections = relationship(
        "Collection",
        secondary="collection_album",
        back_populates="albums",
        lazy="selectin",
    )
    artists = relationship(
        "Artist",
        secondary=album_artist,
        back_populates="albums",
        lazy="selectin",
    )
    loans = relationship(
        "Loan",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Album(discogs_album_id={self.discogs_album_id!r}, owner_id={self.owner_id})>"


# event listeners for timestamps
@event.listens_for(Album, "before_insert")
def set_timestamps(mapper, connection, target):
    now = func.now()
    target.registered_at = now
    target.updated_at = now


@event.listens_for(Album, "before_update")
def update_timestamp(mapper, connection, target):
    target.updated_at = func.now()
