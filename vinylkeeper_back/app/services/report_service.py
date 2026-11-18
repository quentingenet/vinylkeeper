"""
What every kind of member report does the same way: one open report per member and target, a daily
quota, an email to the admins after the response, and the admin closing a report. A subclass says
what is reported and how its reports are told apart (messages, quota, response).
"""
from datetime import timedelta
from typing import Awaitable, Callable, Generic

from sqlalchemy.exc import IntegrityError

from app.core.config_env import settings
from app.core.exceptions import ErrorCode, QuotaExceededError, ResourceNotFoundError, ValidationError
from app.core.logging import logger
from app.core.transaction import transaction_context
from app.mails.client_mail import MailSubject, send_mail
from app.models.user_model import User
from app.repositories.report_repository import Report, ReportRepository

REPORT_WINDOW = timedelta(hours=24)


class ReportService(Generic[Report]):
    def __init__(self, repository: ReportRepository[Report]):
        self.repository = repository

    # What a subclass tells -------------------------------------------------------------------

    def max_reports_per_day(self) -> int:
        raise NotImplementedError

    def already_reported_message(self) -> str:
        raise NotImplementedError

    def quota_message(self) -> str:
        raise NotImplementedError

    # Reporting -------------------------------------------------------------------------------

    def already_reported(self) -> ValidationError:
        return ValidationError(error_code=ErrorCode.RESOURCE_ALREADY_EXISTS, message=self.already_reported_message())

    async def ensure_can_report(self, target_id: int, user: User) -> None:
        """
        Refused while the member's report of this target is open (pending), or for 24 hours after it even once
        closed: one report per member and target a day at most. Refused too past the daily quota of reports.
        """
        if await self.repository.has_open_or_recent_report(target_id, user.id, REPORT_WINDOW):
            raise self.already_reported()
        if await self.repository.count_recent_by_user(user.id, REPORT_WINDOW) >= self.max_reports_per_day():
            raise QuotaExceededError(self.quota_message())

    async def save_once(self, create: Callable[[], Awaitable[object]]) -> None:
        """Saves the report. The same member reporting twice at once: the unique open report wins."""
        try:
            async with transaction_context(self.repository.db):
                await create()
        except IntegrityError:
            raise self.already_reported()

    @staticmethod
    async def notify_admin(subject: MailSubject, what: str, **mail_fields) -> None:
        """Background task, plain values only. Never raises: the report is already saved and listed."""
        try:
            sent = await send_mail(to=settings.EMAIL_ADMIN, subject=subject, **mail_fields)
            if not sent:
                logger.warning("Report email could not be sent for %s", what)
        except Exception as mail_error:
            logger.error("Report email failed for %s: %s", what, mail_error)

    # The admin -------------------------------------------------------------------------------

    async def open_report(self, report_id: int) -> Report:
        report = await self.repository.get(report_id)
        if report is None:
            raise ResourceNotFoundError("Report", report_id)
        if report.status != "open":
            raise ValidationError(error_code=ErrorCode.INVALID_RESOURCE_STATE,
                                  message=f"This report is already {report.status}.")
        return report

    async def reloaded(self, report_id: int) -> Report:
        """The report as the database has it now. Only it is read again: the admin and the rest stay loaded."""
        report = await self.repository.get(report_id, fresh=True)
        assert report is not None
        return report

    async def resolve_report(self, report_id: int, admin: User) -> Report:
        """The target was dealt with: every open report of it is resolved."""
        report = await self.open_report(report_id)
        target_id = getattr(report, self.repository.target_column)
        async with transaction_context(self.repository.db):
            await self.repository.close_open_for_target(target_id, admin.id)
        return await self.reloaded(report_id)

    async def dismiss_report(self, report_id: int, admin: User) -> Report:
        """Nothing was wrong: only this report is closed."""
        await self.open_report(report_id)
        async with transaction_context(self.repository.db):
            await self.repository.close(report_id, "dismissed", admin.id)
        return await self.reloaded(report_id)
