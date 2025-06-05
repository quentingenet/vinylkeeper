from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    UUID as SQLUUID,
    Column,
    ForeignKey,
    Integer,
    String,
    Boolean,
    DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

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
        server_default="UTC+1"
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

    role = relationship("Role", back_populates="users") 
    collections = relationship("Collection", back_populates="owner")
    ratings = relationship("Rating", back_populates="user")
    loans = relationship("Loan", back_populates="user")
    wishlist_items = relationship("Wishlist", back_populates="user")
    liked_collections = relationship(
        "Collection",
        secondary="collection_likes",
        back_populates="liked_by"
    )
    submitted_places = relationship("Place", back_populates="submitted_by")
