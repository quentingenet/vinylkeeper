from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates

from app.models.base import Base


class Place(Base):
    """Model representing a physical place (shop, venue, etc.)."""

    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False, index=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    country = Column(String(100), nullable=True, index=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    description = Column(String(600), nullable=True)
    source_url = Column(String(255), nullable=True)
    is_valid = Column(Boolean, default=True, nullable=False)

    place_type_id = Column(Integer, ForeignKey("place_types.id"), nullable=False)
    place_type = relationship("PlaceType", back_populates="places", lazy="selectin")

    submitted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    submitted_by = relationship("User", back_populates="submitted_places", lazy="selectin")

    is_moderated = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    moderation_requests = relationship("ModerationRequest", back_populates="place", lazy="selectin", cascade="all, delete-orphan")

    likes = relationship("PlaceLike", back_populates="place", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        CheckConstraint("length(name) >= 1", name="check_place_name_length"),
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="check_latitude_range"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="check_longitude_range"),
    )

    @validates('name')
    def validate_name(self, key, name):
        if not name or len(name.strip()) == 0:
            raise ValueError("Place name cannot be empty")
        return name.strip()

    @validates('latitude', 'longitude')
    def validate_coordinates(self, key, value):
        if value is None:
            return value
        if key == 'latitude' and not (-90 <= value <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        if key == 'longitude' and not (-180 <= value <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return value

    def __repr__(self):
        return f"<Place(name={self.name}, city={self.city}, country={self.country}, type={self.place_type.name})>"
