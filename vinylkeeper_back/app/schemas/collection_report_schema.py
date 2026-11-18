from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.report_schema import ReportStatus, blank_is_none

CollectionReportReason = Literal["offensive", "spam", "other"]


class CollectionReportCreate(BaseModel):
    """Why a member reports a public collection of another member."""
    model_config = ConfigDict(extra="forbid")

    reason: CollectionReportReason = Field(..., description="offensive, spam or other")
    comment: Optional[str] = Field(None, max_length=500, description="What is wrong")

    @field_validator("comment")
    @classmethod
    def blank_comment_is_none(cls, v: Optional[str]) -> Optional[str]:
        return blank_is_none(v)


class ReportedCollection(BaseModel):
    """The reported collection, as it is now."""
    id: int
    name: str
    description: Optional[str] = None
    is_public: bool
    owner: Optional[str] = Field(None, description="Username of the owner")


class CollectionReportResponse(BaseModel):
    id: int
    collection: ReportedCollection
    reason: CollectionReportReason
    comment: Optional[str] = None
    status: ReportStatus
    reporter: Optional[str] = Field(None, description="Username, None once the account is deleted")
    created_at: datetime
    resolved_at: Optional[datetime] = None


class CollectionReportListResponse(BaseModel):
    items: List[CollectionReportResponse]
    total: int
    page: int
    limit: int
    open_count: int = Field(..., description="Open reports, whatever the status listed")
