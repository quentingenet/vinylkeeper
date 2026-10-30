"""
Members report wrong information on an Atlas spot; the admin fixes the spot from the admin panel,
without touching the database by hand.
"""
from datetime import timedelta
from typing import Optional

from sqlalchemy.exc import IntegrityError

from app.core.config_env import settings
from app.core.exceptions import QuotaExceededError, ResourceNotFoundError, ValidationError, ErrorCode
from app.core.logging import logger
from app.core.transaction import transaction_context
from app.mails.client_mail import MailSubject, send_mail
from app.models.place_model import Place
from app.models.place_report_model import PlaceReport
from app.models.user_model import User
from app.repositories.atlas_repository import AtlasRepository
from app.repositories.place_report_repository import PlaceReportRepository
from app.schemas.place_report_schema import (
    PlaceReportCreate,
    PlaceReportListResponse,
    PlaceReportResponse,
    ReportedPlace,
)
from app.schemas.place_schema import PlaceUpdate
from app.utils.geocoding import geocode_city

# A member reports at most that many spots a day: enough for real mistakes, not for spam
MAX_REPORTS_PER_DAY = 10
REPORT_WINDOW = timedelta(hours=24)


def reported_place(place: Place) -> ReportedPlace:
    return ReportedPlace(
        id=place.id, name=place.name, address=place.address, city=place.city, country=place.country,
        description=place.description, source_url=place.source_url, place_type_id=place.place_type_id,
        place_type=place.place_type.name if place.place_type else None,
        is_valid=place.is_valid, is_moderated=place.is_moderated,
    )


def report_response(report: PlaceReport) -> PlaceReportResponse:
    return PlaceReportResponse(
        id=report.id, place=reported_place(report.place), issues=list(report.issues), comment=report.comment,
        status=report.status, reporter=report.user.username if report.user else None,
        created_at=report.created_at, resolved_at=report.resolved_at,
    )


class PlaceReportService:
    def __init__(self, repository: PlaceReportRepository, atlas_repository: AtlasRepository):
        self.repository = repository
        self.atlas_repository = atlas_repository

    async def report_place(self, user: User, place_id: int, data: PlaceReportCreate) -> None:
        """A member reports a spot of the Atlas; the admins get an email."""
        place = await self.atlas_repository.get_place_by_id(place_id)
        if not place.is_moderated:
            # Not on the map yet: the admin reviews it anyway
            raise ResourceNotFoundError("Spot", place_id)
        if await self.repository.has_open_report(place_id, user.id):
            raise self._already_reported()
        if await self.repository.count_recent_by_user(user.id, REPORT_WINDOW) >= MAX_REPORTS_PER_DAY:
            raise QuotaExceededError(f"You can report {MAX_REPORTS_PER_DAY} spots a day. Please try again tomorrow.")
        try:
            async with transaction_context(self.repository.db):
                await self.repository.create(place_id, user.id, data.issues, data.comment)
        except IntegrityError:
            # The same member reporting twice at once: the unique open report wins
            raise self._already_reported()
        logger.info(f"Atlas: {user.username} reported spot {place_id} ({', '.join(data.issues)})")
        await self._notify_admin(place, user, data)

    @staticmethod
    def _already_reported() -> ValidationError:
        return ValidationError(
            error_code=ErrorCode.RESOURCE_ALREADY_EXISTS,
            message="You already reported this spot: an admin will check it.",
        )

    async def _notify_admin(self, place: Place, user: User, data: PlaceReportCreate) -> None:
        """Never raises: the report is already saved and listed in the admin panel."""
        try:
            sent = await send_mail(
                to=settings.EMAIL_ADMIN, subject=MailSubject.AtlasSpotReported,
                place_name=place.name, place_city=place.city, place_country=place.country,
                issues=data.issues, username=user.username, user_email=user.email, comment=data.comment,
            )
            if not sent:
                logger.warning("Atlas spot report email could not be sent for place_id=%s", place.id)
        except Exception as mail_error:
            logger.error("Atlas spot report email failed for place_id=%s: %s", place.id, mail_error)

    async def list_reports(self, status: Optional[str], page: int, limit: int) -> PlaceReportListResponse:
        reports, total = await self.repository.list_reports(status, page, limit)
        return PlaceReportListResponse(
            items=[report_response(report) for report in reports], total=total, page=page, limit=limit,
            open_count=await self.repository.count_open(),
        )

    async def resolve(self, report_id: int, admin: User) -> PlaceReportResponse:
        """The spot was fixed: every open report of it is resolved."""
        report = await self._open_report(report_id)
        async with transaction_context(self.repository.db):
            await self.repository.close_open_for_place(report.place_id, admin.id)
        return await self._reloaded(report_id)

    async def dismiss(self, report_id: int, admin: User) -> PlaceReportResponse:
        """Nothing was wrong: only this report is closed."""
        await self._open_report(report_id)
        async with transaction_context(self.repository.db):
            await self.repository.close(report_id, "dismissed", admin.id)
        return await self._reloaded(report_id)

    async def _open_report(self, report_id: int) -> PlaceReport:
        report = await self.repository.get(report_id)
        if report is None:
            raise ResourceNotFoundError("Report", report_id)
        if report.status != "open":
            raise ValidationError(error_code=ErrorCode.INVALID_RESOURCE_STATE,
                                  message=f"This report is already {report.status}.")
        return report

    async def _reloaded(self, report_id: int) -> PlaceReportResponse:
        self.repository.db.expire_all()
        report = await self.repository.get(report_id)
        assert report is not None
        return report_response(report)

    async def update_place(self, admin: User, place_id: int, data: PlaceUpdate) -> ReportedPlace:
        """
        The admin corrects a spot: published as is, no moderation. A new city or country without
        coordinates moves the pin to that city.
        """
        place = await self.atlas_repository.get_place_by_id(place_id)
        changes = data.model_dump(exclude_unset=True)
        new_type = changes.get("place_type_id")
        if new_type is not None and not await self.atlas_repository.get_place_type_by_id(new_type):
            raise ValidationError(error_code=ErrorCode.INVALID_INPUT,
                                  message=f"Spot type with ID {changes['place_type_id']} not found")
        moved = any(key in changes and changes[key] != getattr(place, key) for key in ("city", "country"))
        if moved and "latitude" not in changes and "longitude" not in changes:
            city, country = changes.get("city", place.city), changes.get("country", place.country)
            coordinates = await geocode_city(city, country)
            if not coordinates:
                raise ValidationError(
                    error_code=ErrorCode.INVALID_INPUT,
                    message=f"Could not find {city}, {country} on the map. Please check the city and country.",
                )
            changes["latitude"], changes["longitude"] = coordinates
        async with transaction_context(self.atlas_repository.db):
            await self.atlas_repository.update_place(place_id, changes)
        logger.info(f"Atlas: admin {admin.username} updated spot {place_id} ({', '.join(sorted(changes))})")
        self.atlas_repository.db.expire_all()
        return reported_place(await self.atlas_repository.get_place_by_id(place_id))

    async def remove_place(self, admin: User, place_id: int) -> None:
        """A permanently closed spot leaves the map; its open reports are resolved."""
        async with transaction_context(self.atlas_repository.db):
            await self.atlas_repository.delete_place(place_id)
            await self.repository.close_open_for_place(place_id, admin.id)
        logger.info(f"Atlas: admin {admin.username} removed spot {place_id} from the map")
