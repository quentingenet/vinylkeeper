from datetime import datetime
from sqlalchemy import Column, ForeignKey, Integer, DateTime, func, UniqueConstraint, event
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError
from app.db.base import Base

class CollectionLike(Base):
    """Model representing a like on a collection by a user.
    
    A user can only like a collection once. This is enforced by a unique constraint
    on the combination of user_id and collection_id.
    """

    __tablename__ = "collection_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    collection_id = Column(
        Integer,
        ForeignKey("collections.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    user = relationship(
        "User",
        back_populates="liked_collections",
        lazy="selectin"  # Optimise le chargement des likes
    )
    collection = relationship(
        "Collection",
        back_populates="liked_by",
        lazy="selectin"  # Optimise le chargement des likes
    )

    # Ensure a user can only like a collection once
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "collection_id",
            name="uix_user_collection_like",
            # This constraint ensures that a user can only like a collection once
            # If a user tries to like the same collection again, the database will raise an integrity error
        ),
    )

    @validates('user_id', 'collection_id')
    def validate_foreign_keys(self, key, value):
        """Validate foreign key relationships."""
        if value is None:
            raise ValueError(f"{key} cannot be null")
        return value

    def __repr__(self):
        """String representation of the like."""
        return f"<CollectionLike(user_id={self.user_id}, collection_id={self.collection_id})>"


# Event listeners for additional validation
@event.listens_for(CollectionLike, 'before_insert')
def check_duplicate_like(mapper, connection, target):
    """Check for duplicate likes before insertion."""
    # This is an additional check at the ORM level
    # The database constraint will also prevent duplicates
    stmt = """
        SELECT 1 FROM collection_likes 
        WHERE user_id = :user_id AND collection_id = :collection_id
    """
    result = connection.execute(
        stmt,
        {"user_id": target.user_id, "collection_id": target.collection_id}
    ).scalar()
    
    if result:
        raise IntegrityError(
            "Duplicate like",
            "uix_user_collection_like",
            "collection_likes"
        ) 