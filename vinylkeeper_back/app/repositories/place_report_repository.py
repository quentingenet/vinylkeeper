from datetime import timedelta
from typing import Optional, cast

from sqlalchemy import case, func, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.place_model import Place
from app.models.place_report_model import PlaceReport


class PlaceReportRepository:
    """Reports of wrong information on Atlas spots. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _with_place_and_reporter():
        return (selectinload(PlaceReport.place).selectinload(Place.place_type), selectinload(PlaceReport.user))

    async def create(self, place_id: int, user_id: int, issues: list[str], comment: Optional[str]) -> PlaceReport:
        report = PlaceReport(place_id=place_id, user_id=user_id, issues=issues, comment=comment)
        self.db.add(report)
        await self.db.flush()
        return report

    async def has_open_report(self, place_id: int, user_id: int) -> bool:
        query = select(PlaceReport.id).where(
            PlaceReport.place_id == place_id, PlaceReport.user_id == user_id, PlaceReport.status == "open")
        return (await self.db.execute(query.limit(1))).first() is not None

    async def count_recent_by_user(self, user_id: int, window: timedelta) -> int:
        query = select(func.count(PlaceReport.id)).where(
            PlaceReport.user_id == user_id, PlaceReport.created_at > func.now() - window)
        return (await self.db.execute(query)).scalar_one()

    async def list_reports(self, status: Optional[str], page: int, limit: int) -> tuple[list[PlaceReport], int]:
        """Open reports first, newest first. status None lists every report."""
        query = select(PlaceReport).options(*self._with_place_and_reporter())
        count_query = select(func.count(PlaceReport.id))
        if status:
            query = query.where(PlaceReport.status == status)
            count_query = count_query.where(PlaceReport.status == status)
        query = query.order_by(
            case((PlaceReport.status == "open", 0), else_=1), PlaceReport.created_at.desc(), PlaceReport.id.desc()
        ).offset((page - 1) * limit).limit(limit)
        reports = list((await self.db.execute(query)).scalars().all())
        return reports, (await self.db.execute(count_query)).scalar_one()

    async def count_open(self) -> int:
        return (await self.db.execute(
            select(func.count(PlaceReport.id)).where(PlaceReport.status == "open"))).scalar_one()

    async def get(self, report_id: int) -> Optional[PlaceReport]:
        query = select(PlaceReport).options(*self._with_place_and_reporter()).where(PlaceReport.id == report_id)
        return (await self.db.execute(query)).scalar_one_or_none()

    async def close(self, report_id: int, status: str, admin_id: int) -> None:
        await self.db.execute(
            update(PlaceReport).where(PlaceReport.id == report_id, PlaceReport.status == "open")
            .values(status=status, resolved_at=func.now(), resolved_by_id=admin_id)
        )

    async def close_open_for_place(self, place_id: int, admin_id: int) -> int:
        """Every open report of the spot, resolved together: the spot was fixed for all of them."""
        result = cast(CursorResult, await self.db.execute(
            update(PlaceReport).where(PlaceReport.place_id == place_id, PlaceReport.status == "open")
            .values(status="resolved", resolved_at=func.now(), resolved_by_id=admin_id)
        ))
        return result.rowcount
