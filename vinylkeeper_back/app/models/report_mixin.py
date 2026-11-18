"""What every report of a member has in common, whatever is reported (an Atlas spot, a public collection)."""
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import declared_attr, relationship

REPORT_STATUSES = ("open", "resolved", "dismissed")


def report_status_check(table: str) -> CheckConstraint:
    return CheckConstraint(f"status IN {REPORT_STATUSES}", name=f"ck_{table}_status")


def one_open_report_per_member(table: str, target_column: str) -> Index:
    """One open report per member and target: reporting again waits for the admin."""
    return Index(f"uq_{table}_open_per_user", target_column, "user_id", unique=True,
                 postgresql_where=text("status = 'open'"))


class ReportMixin:
    """The member who reports, and how an admin closed the report. The table adds its target and details."""

    id = Column(Integer, primary_key=True)
    status = Column(String(10), nullable=False, server_default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    @declared_attr
    def user_id(cls):
        return Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def resolved_by_id(cls):
        return Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def user(cls):
        """The member who reported, None once the account is deleted"""
        return relationship("User", foreign_keys=lambda: [cls.user_id], lazy="raise")
