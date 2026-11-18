from datetime import timedelta
from typing import Any, ClassVar, Generic, Optional, TypeVar, cast

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report_mixin import ReportMixin

Report = TypeVar("Report", bound=ReportMixin)


class ReportRepository(Generic[Report]):
    """
    What every kind of member report needs from the database, whatever is reported. A subclass names
    its model, the column of its target, and how its target is loaded. Callers own the commit.
    """

    model: ClassVar[type]
    target_column: ClassVar[str]

    def __init__(self, db: AsyncSession):
        self.db = db

    def _target(self) -> Any:
        return getattr(self.model, self.target_column)

    def _loading(self) -> tuple:
        """Loader options of what a listed report shows: its target and its reporter."""
        return ()

    async def has_open_or_recent_report(self, target_id: int, user_id: int, window: timedelta) -> bool:
        """The member reported this target and it is still open, or did within the window, closed or not."""
        query = select(self.model.id).where(
            self._target() == target_id, self.model.user_id == user_id,
            or_(self.model.status == "open", self.model.created_at > func.now() - window))
        return (await self.db.execute(query.limit(1))).first() is not None

    async def count_recent_by_user(self, user_id: int, window: timedelta) -> int:
        query = select(func.count(self.model.id)).where(
            self.model.user_id == user_id, self.model.created_at > func.now() - window)
        return (await self.db.execute(query)).scalar_one()

    async def list_reports(self, status: Optional[str], page: int, limit: int) -> tuple[list[Report], int]:
        """Open reports first, newest first. status None lists every report."""
        query = select(self.model).options(*self._loading())
        count_query = select(func.count(self.model.id))
        if status:
            query = query.where(self.model.status == status)
            count_query = count_query.where(self.model.status == status)
        query = query.order_by(
            case((self.model.status == "open", 0), else_=1), self.model.created_at.desc(), self.model.id.desc()
        ).offset((page - 1) * limit).limit(limit)
        reports = list((await self.db.execute(query)).scalars().all())
        return reports, (await self.db.execute(count_query)).scalar_one()

    async def count_open(self) -> int:
        return (await self.db.execute(
            select(func.count(self.model.id)).where(self.model.status == "open"))).scalar_one()

    async def get(self, report_id: int, fresh: bool = False) -> Optional[Report]:
        """fresh: read again from the database, the report and what it loads, even if already in the session."""
        query = select(self.model).options(*self._loading()).where(self.model.id == report_id)
        if fresh:
            query = query.execution_options(populate_existing=True)
        return (await self.db.execute(query)).scalar_one_or_none()

    async def close(self, report_id: int, status: str, admin_id: int) -> None:
        await self.db.execute(
            update(self.model).where(self.model.id == report_id, self.model.status == "open")
            .values(status=status, resolved_at=func.now(), resolved_by_id=admin_id)
        )

    async def close_open_for_target(self, target_id: int, admin_id: int) -> int:
        """Every open report of the target, resolved together: it was dealt with for all of them."""
        result = cast(CursorResult, await self.db.execute(
            update(self.model).where(self._target() == target_id, self.model.status == "open")
            .values(status="resolved", resolved_at=func.now(), resolved_by_id=admin_id)
        ))
        return result.rowcount
