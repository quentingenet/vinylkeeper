from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.models.base import Base

# What a member can say is wrong about an Atlas spot
PLACE_REPORT_ISSUES = ("name", "description", "address", "website", "type", "closed")
PLACE_REPORT_STATUSES = ("open", "resolved", "dismissed")


class PlaceReport(Base):
    """A member saying some information of an Atlas spot is wrong, for an admin to check."""
    __tablename__ = "place_reports"

    __table_args__ = (
        CheckConstraint(f"status IN {PLACE_REPORT_STATUSES}", name="ck_place_reports_status"),
        CheckConstraint(
            f"cardinality(issues) > 0 AND issues <@ ARRAY{list(PLACE_REPORT_ISSUES)}::varchar[]",
            name="ck_place_reports_issues",
        ),
        # One open report per member and spot: reporting again waits for the admin
        Index("uq_place_reports_open_per_user", "place_id", "user_id", unique=True,
              postgresql_where=text("status = 'open'")),
    )

    id = Column(Integer, primary_key=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    issues = Column(ARRAY(String(20)), nullable=False,
                    comment="Among name, description, address, website, type, closed")
    comment = Column(String(500), nullable=True, comment="What it should be, in the member's words")
    status = Column(String(10), nullable=False, server_default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    place = relationship("Place", lazy="raise")
    user = relationship("User", foreign_keys=[user_id], lazy="raise")

    def __repr__(self):
        return f"<PlaceReport(id={self.id}, place_id={self.place_id}, status={self.status!r})>"
