from typing import Optional

from sqlalchemy.orm import selectinload

from app.models.collection_model import Collection
from app.models.collection_report_model import CollectionReport
from app.repositories.report_repository import ReportRepository


class CollectionReportRepository(ReportRepository[CollectionReport]):
    """Reports of abuse in public collections. Callers own the commit."""

    model = CollectionReport
    target_column = "collection_id"

    def _loading(self) -> tuple:
        return (selectinload(CollectionReport.collection).selectinload(Collection.owner),
                selectinload(CollectionReport.user))

    async def create(self, collection_id: int, user_id: int, reason: str, comment: Optional[str]) -> CollectionReport:
        report = CollectionReport(collection_id=collection_id, user_id=user_id, reason=reason, comment=comment)
        self.db.add(report)
        await self.db.flush()
        return report
