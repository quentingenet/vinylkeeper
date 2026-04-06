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
from sqlalchemy.orm import relationship
from app.models.base import Base


class User(Base):
    """User model representing a user in the system.

    This model stores user information and manages relationships with other entities
    such as albums, artists, collections, and wishlist items.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
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
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    loans = relationship(
        "Loan",
        back_populates="user",
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    wishlist_items = relationship(
        "Wishlist",
        back_populates="user",
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    likes = relationship(
        "Like",
        back_populates="user",
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    place_likes = relationship(
        "PlaceLike",
        back_populates="user",
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    submitted_places = relationship(
        "Place",
        back_populates="submitted_by",
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    moderation_requests = relationship(
        "ModerationRequest", back_populates="user", lazy="noload")

    def __repr__(self):
        """String representation of the user."""
        return f"<User(username={self.username}, email={self.email})>"


# Event listeners
@event.listens_for(User, 'before_insert')
def set_defaults(mapper, connection, target):
    """Set default values before insertion."""
    if not target.user_uuid:
        target.user_uuid = uuid.uuid4()


