"""
Members report abuse in a public collection of another member; the admins get an email and check
it from the admin panel. Shared rules of every report: ReportService.
"""
from typing import Optional

from fastapi import BackgroundTasks

from app.core.exceptions import ErrorCode, ResourceNotFoundError, ValidationError
from app.core.logging import log_activity
from app.mails.client_mail import MailSubject
from app.models.collection_report_model import CollectionReport
from app.models.user_model import User
from app.repositories.collection_report_repository import CollectionReportRepository
from app.repositories.collection_repository import CollectionRepository
from app.schemas.collection_report_schema import (
    CollectionReportCreate,
    CollectionReportListResponse,
    CollectionReportResponse,
    ReportedCollection,
)
from app.services.report_service import ReportService

# A member reports at most that many collections a day: enough for real abuse, not for spam
MAX_REPORTS_PER_DAY = 10


def report_response(report: CollectionReport) -> CollectionReportResponse:
    collection = report.collection
    return CollectionReportResponse(
        id=report.id,
        collection=ReportedCollection(
            id=collection.id, name=collection.name, description=collection.description,
            is_public=collection.is_public, owner=collection.owner.username if collection.owner else None,
        ),
        reason=report.reason, comment=report.comment, status=report.status,
        reporter=report.user.username if report.user else None,
        created_at=report.created_at, resolved_at=report.resolved_at,
    )


class CollectionReportService(ReportService[CollectionReport]):
    repository: CollectionReportRepository

    def __init__(self, repository: CollectionReportRepository, collection_repository: CollectionRepository):
        super().__init__(repository)
        self.collection_repository = collection_repository

    def max_reports_per_day(self) -> int:
        return MAX_REPORTS_PER_DAY

    def already_reported_message(self) -> str:
        return "You already reported this collection: an admin will check it."

    def quota_message(self) -> str:
        return f"You can report {MAX_REPORTS_PER_DAY} collections a day. Please try again tomorrow."

    async def report_collection(
        self, user: User, collection_id: int, data: CollectionReportCreate, background_tasks: BackgroundTasks
    ) -> None:
        """A member reports a public collection of someone else; the admins get an email."""
        collection = await self.collection_repository.get_by_id(collection_id, load_minimal=True)
        if not collection.is_public:
            # A private collection is not shown to others: it cannot be reported, and says nothing of itself
            raise ResourceNotFoundError("Collection", collection_id)
        if collection.owner_id == user.id:
            raise ValidationError(error_code=ErrorCode.INVALID_INPUT, message="You cannot report your own collection.")
        await self.ensure_can_report(collection_id, user)
        await self.save_once(lambda: self.repository.create(collection_id, user.id, data.reason, data.comment))
        log_activity(user.username, f"reported collection #{collection_id} {collection.name!r} ({data.reason})")
        # After the response: a slow SMTP must not hold the request
        background_tasks.add_task(
            self.notify_admin, MailSubject.CollectionReported, f"collection_id={collection_id}",
            collection_id=collection_id, collection_name=collection.name,
            owner_username=collection.owner.username if collection.owner else "",
            reason=data.reason, username=user.username, user_email=user.email, comment=data.comment,
        )

    async def list_reports(self, status: Optional[str], page: int, limit: int) -> CollectionReportListResponse:
        reports, total = await self.repository.list_reports(status, page, limit)
        return CollectionReportListResponse(
            items=[report_response(report) for report in reports], total=total, page=page, limit=limit,
            open_count=await self.repository.count_open(),
        )

    async def resolve(self, report_id: int, admin: User) -> CollectionReportResponse:
        """The collection was dealt with: every open report of it is resolved."""
        return report_response(await self.resolve_report(report_id, admin))

    async def dismiss(self, report_id: int, admin: User) -> CollectionReportResponse:
        """Nothing was wrong: only this report is closed."""
        return report_response(await self.dismiss_report(report_id, admin))
