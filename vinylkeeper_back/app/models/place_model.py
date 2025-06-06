from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    event,
    CheckConstraint,
    Enum as SQLEnum
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError

from app.db.base import Base
from app.core.enums import PlaceTypeEnum


class Place(Base):
    """Model representing a physical place (shop, venue, etc.)."""

    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(
        String(255),
        nullable=False,
        index=True
    )
    address = Column(
        String(255),
        nullable=True
    )
    city = Column(
        String(100),
        nullable=True,
        index=True
    )
    country = Column(
        String(100),
        nullable=True,
        index=True
    )
    latitude = Column(
        Float,
        nullable=False
    )
    longitude = Column(
        Float,
        nullable=False
    )
    type = Column(
        SQLEnum(PlaceTypeEnum, name="place_type_enum"),
        nullable=False,
        default=PlaceTypeEnum.other.value,
        server_default=PlaceTypeEnum.other.value
    )
    submitted_by_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    is_verified = Column(
        Boolean,
        default=False,
        nullable=False
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relations optimisées
    submitted_by = relationship(
        "User",
        back_populates="submitted_places",
        lazy="selectin"
    )
    moderation_requests = relationship(
        "ModerationRequest",
        back_populates="place",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    # Contraintes de validation
    __table_args__ = (
        CheckConstraint(
            "length(name) >= 1",
            name="check_place_name_length"
        ),
        CheckConstraint(
            "latitude >= -90 AND latitude <= 90",
            name="check_latitude_range"
        ),
        CheckConstraint(
            "longitude >= -180 AND longitude <= 180",
            name="check_longitude_range"
        ),
    )

    @validates('name')
    def validate_name(self, key, name):
        """Validate place name."""
        if not name or len(name.strip()) == 0:
            raise ValueError("Place name cannot be empty")
        return name.strip()

    @validates('latitude', 'longitude')
    def validate_coordinates(self, key, value):
        """Validate coordinates."""
        if value is None:
            raise ValueError(f"{key} cannot be null")
        if key == 'latitude' and (value < -90 or value > 90):
            raise ValueError("Latitude must be between -90 and 90")
        if key == 'longitude' and (value < -180 or value > 180):
            raise ValueError("Longitude must be between -180 and 180")
        return value

    @validates('type')
    def validate_type(self, key, value):
        """Validate place type."""
        if value not in PlaceTypeEnum.__members__.values() and value not in PlaceTypeEnum._value2member_map_:
            raise ValueError(f"Invalid place type: {value}")
        return value

    def __repr__(self):
        """String representation of the place."""
        return f"<Place(name={self.name}, city={self.city}, country={self.country}, type={self.type})>"


# Event listeners
@event.listens_for(Place, 'before_insert')
def validate_required_fields(mapper, connection, target):
    """Validate required fields before insertion."""
    if not target.name:
        raise ValueError("Place name is required")
    if target.latitude is None or target.longitude is None:
        raise ValueError("Both latitude and longitude are required")
    if not target.type:
        target.type = PlaceTypeEnum.other.value
