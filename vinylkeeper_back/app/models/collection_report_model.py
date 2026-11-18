from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.report_mixin import ReportMixin, one_open_report_per_member, report_status_check

# Why a member reports a public collection
COLLECTION_REPORT_REASONS = ("offensive", "spam", "other")


class CollectionReport(ReportMixin, Base):
    """A member reporting abuse in a public collection of another member, for an admin to check."""
    __tablename__ = "collection_reports"

    __table_args__ = (
        report_status_check("collection_reports"),
        CheckConstraint(f"reason IN {COLLECTION_REPORT_REASONS}", name="ck_collection_reports_reason"),
        one_open_report_per_member("collection_reports", "collection_id"),
    )

    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String(20), nullable=False, comment="offensive, spam or other")
    comment = Column(String(500), nullable=True, comment="What is wrong, in the member's words")

    collection = relationship("Collection", lazy="raise")

    def __repr__(self):
        return f"<CollectionReport(id={self.id}, collection_id={self.collection_id}, status={self.status!r})>"
