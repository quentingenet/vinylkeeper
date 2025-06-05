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
from sqlalchemy.exc import IntegrityError

from app.models.base import Base


class Loan(Base):
    """Loan model."""

    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    album_id = Column(
        Integer,
        ForeignKey("albums.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    loaned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    returned_at = Column(
        DateTime(timezone=True),
        nullable=True
    )
    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )
    comment = Column(
        String(255),
        nullable=True
    )
    borrower_name = Column(String(255), nullable=False, index=True)
    start_date = Column(DateTime(timezone=True),
                        nullable=False, server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_returned = Column(Boolean, default=False, nullable=False)

    # Relations optimisées
    user = relationship(
        "User",
        back_populates="loans",
        lazy="selectin"
    )
    album = relationship(
        "Album",
        back_populates="loans",
        lazy="selectin"
    )

    # Contraintes de validation
    __table_args__ = (
        CheckConstraint(
            "length(comment) <= 255",
            name="check_comment_length"
        ),
    )

    @validates('comment')
    def validate_comment(self, key, comment):
        if comment is not None and len(comment) > 255:
            raise ValueError("Comment cannot be longer than 255 characters")
        return comment

    def __repr__(self):
        """String representation of the loan."""
        return f"<Loan(user_id={self.user_id}, album_id={self.album_id})>"


# Event listeners
@event.listens_for(Loan, 'before_insert')
def set_loaned_at(mapper, connection, target):
    """Set loaned_at before insertion."""
    target.loaned_at = func.now()


@event.listens_for(Loan, 'before_update')
def check_return_status(mapper, connection, target):
    """Check and update return status."""
    if target.is_active and not target.returned_at:
        target.returned_at = func.now()
