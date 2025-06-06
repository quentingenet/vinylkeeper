from uuid import UUID

from sqlalchemy import (
    UUID as SQLUUID,
    Column,
    ForeignKey,
    Integer,
    String,
    Boolean,
    DateTime,
    event,
    func
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError

from app.db.base import Base


class User(Base):
    """Model representing a user in the system."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    password = Column(
        String(255),
        nullable=False
    )
    is_accepted_terms = Column(
        Boolean,
        default=False,
        nullable=False
    )
    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )
    is_superuser = Column(
        Boolean,
        default=False,
        nullable=False
    )
    last_login = Column(
        DateTime(timezone=True),
        nullable=True
    )
    registered_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    timezone = Column(
        String(100),
        nullable=False,
        server_default="Europe/Paris"
    )
    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False
    )
    user_uuid = Column(
        SQLUUID(as_uuid=True),
        nullable=False,
        unique=True
    )
    number_of_connections = Column(
        Integer,
        default=0,
        nullable=False
    )

    # Relations optimisées avec lazy loading approprié
    role = relationship(
        "Role",
        back_populates="users",
        lazy="selectin"  # Charge le rôle immédiatement avec l'utilisateur
    )
    collections = relationship(
        "Collection",
        back_populates="owner",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    loans = relationship(
        "Loan",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    wishlist_items = relationship(
        "Wishlist",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    liked_collections = relationship(
        "Collection",
        secondary="collection_likes",
        back_populates="liked_by",
        lazy="selectin"
    )
    submitted_places = relationship(
        "Place",
        back_populates="submitted_by",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    @validates('username', 'email')
    def validate_unique_fields(self, key, value):
        """Validate unique fields."""
        if value is None:
            raise ValueError(f"{key} cannot be null")
        return value

    @validates('timezone')
    def validate_timezone(self, key, value):
        """Validate timezone format."""
        if value is None:
            raise ValueError("Timezone cannot be null")
        # Vérification basique du format timezone
        if not value or '/' not in value:
            raise ValueError("Invalid timezone format")
        return value

    def __repr__(self):
        """String representation of the user."""
        return f"<User(username={self.username}, email={self.email})>"


# Event listeners
@event.listens_for(User, 'before_insert')
def set_defaults(mapper, connection, target):
    """Set default values before insertion."""
    if not target.user_uuid:
        target.user_uuid = UUID.uuid4()


@event.listens_for(User, 'before_update')
def update_last_login(mapper, connection, target):
    """Update last_login and number_of_connections before update."""
    if hasattr(target, 'last_login') and target.last_login is None:
        target.last_login = func.now()
        target.number_of_connections += 1
