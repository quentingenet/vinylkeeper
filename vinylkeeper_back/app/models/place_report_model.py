from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.report_mixin import REPORT_STATUSES, ReportMixin, one_open_report_per_member, report_status_check

# What a member can say is wrong about an Atlas spot
PLACE_REPORT_ISSUES = ("name", "description", "address", "website", "type", "closed")
PLACE_REPORT_STATUSES = REPORT_STATUSES


class PlaceReport(ReportMixin, Base):
    """A member saying some information of an Atlas spot is wrong, for an admin to check."""
    __tablename__ = "place_reports"

    __table_args__ = (
        report_status_check("place_reports"),
        CheckConstraint(
            f"cardinality(issues) > 0 AND issues <@ ARRAY{list(PLACE_REPORT_ISSUES)}::varchar[]",
            name="ck_place_reports_issues",
        ),
        one_open_report_per_member("place_reports", "place_id"),
    )

    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    issues = Column(ARRAY(String(20)), nullable=False,
                    comment="Among name, description, address, website, type, closed")
    comment = Column(String(500), nullable=True, comment="What it should be, in the member's words")

    place = relationship("Place", lazy="raise")

    def __repr__(self):
        return f"<PlaceReport(id={self.id}, place_id={self.place_id}, status={self.status!r})>"
