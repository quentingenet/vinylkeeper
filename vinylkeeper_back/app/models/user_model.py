import uuid
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
from app.models.base import Base


class User(Base):
    """User model representing a user in the system.

    This model stores user information and manages relationships with other entities
    such as albums, artists, collections, and wishlist items.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(
        String(50),
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
        String(1024),
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
    created_at = Column(
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

    # Relationships
    role = relationship(
        "Role",
        back_populates="users",
        lazy="selectin"
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

    likes = relationship(
        "Like",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    
    place_likes = relationship(
        "PlaceLike",
        back_populates="user",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    
    submitted_places = relationship(
        "Place",
        back_populates="submitted_by",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    moderation_requests = relationship(
        "ModerationRequest", back_populates="user", lazy="selectin")

    @validates('username', 'email')
    def validate_unique_fields(self, key, value):
        """Validate unique fields."""
        if value is None:
            raise ValueError(f"{key} cannot be null")
        
        if key == 'username':
            if len(value) < 3:
                raise ValueError("Username must contain at least 3 characters")
            if len(value) > 50:
                raise ValueError("Username must not exceed 50 characters")
        
        return value

    @validates('password')
    def validate_password(self, key, value):
        """Validate password complexity."""
        if value is None:
            raise ValueError("Password cannot be null")
        
        # Skip validation for hashed passwords (they start with $argon2)
        if value.startswith('$argon2'):
            return value
        
        # Validate plain password
        if len(value) < 4:
            raise ValueError("Password must contain at least 4 characters")
        
        if not any(c.isalpha() for c in value):
            raise ValueError("Password must contain at least one letter")
        
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number")
        
        return value

    @validates('timezone')
    def validate_timezone(self, key, value):
        """Validate timezone format."""
        if value is None:
            raise ValueError("Timezone cannot be null")
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
        target.user_uuid = uuid.uuid4()


@event.listens_for(User, 'before_update')
def update_last_login(mapper, connection, target):
    """Update last_login and number_of_connections before update."""
    if hasattr(target, 'last_login') and target.last_login is None:
        target.last_login = func.now()
        target.number_of_connections += 1
