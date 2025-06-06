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

from app.db.base import Base


class Loan(Base):
    """Model representing a loan of an album to a user."""

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
    borrower_name = Column(
        String(255),
        nullable=False,
        index=True
    )
    start_date = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    end_date = Column(
        DateTime(timezone=True),
        nullable=True
    )
    is_returned = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # Optimized relationships
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

    # Validation constraints
    __table_args__ = (
        CheckConstraint(
            "length(borrower_name) >= 1",
            name="check_borrower_name_length"
        ),
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="check_loan_dates"
        ),
    )

    @validates('borrower_name')
    def validate_borrower_name(self, key, name):
        """Validate borrower name."""
        if not name or len(name.strip()) == 0:
            raise ValueError("Borrower name cannot be empty")
        return name.strip()

    @validates('end_date')
    def validate_end_date(self, key, end_date):
        """Validate end date."""
        if end_date is not None and end_date < self.start_date:
            raise ValueError("End date cannot be before start date")
        return end_date

    def __repr__(self):
        """String representation of the loan."""
        return f"<Loan(album_id={self.album_id}, borrower={self.borrower_name})>"


# Event listeners
@event.listens_for(Loan, 'before_insert')
def set_start_date(mapper, connection, target):
    """Set start date before insertion."""
    if not target.start_date:
        target.start_date = func.now()


@event.listens_for(Loan, 'before_update')
def check_return_status(mapper, connection, target):
    """Check and update return status."""
    if target.is_returned and not target.end_date:
        target.end_date = func.now()
