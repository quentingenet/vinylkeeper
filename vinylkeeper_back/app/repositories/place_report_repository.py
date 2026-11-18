from typing import Optional

from sqlalchemy.orm import selectinload

from app.models.place_model import Place
from app.models.place_report_model import PlaceReport
from app.repositories.report_repository import ReportRepository


class PlaceReportRepository(ReportRepository[PlaceReport]):
    """Reports of wrong information on Atlas spots. Callers own the commit."""

    model = PlaceReport
    target_column = "place_id"

    def _loading(self) -> tuple:
        return (selectinload(PlaceReport.place).selectinload(Place.place_type), selectinload(PlaceReport.user))

    async def create(self, place_id: int, user_id: int, issues: list[str], comment: Optional[str]) -> PlaceReport:
        report = PlaceReport(place_id=place_id, user_id=user_id, issues=issues, comment=comment)
        self.db.add(report)
        await self.db.flush()
        return report

    async def close_open_for_place(self, place_id: int, admin_id: int) -> int:
        """Every open report of the spot, resolved together: the spot was fixed for all of them."""
        return await self.close_open_for_target(place_id, admin_id)
