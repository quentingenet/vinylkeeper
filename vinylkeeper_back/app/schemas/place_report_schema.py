from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

PlaceReportIssue = Literal["name", "description", "address", "website", "type", "closed"]
PlaceReportStatus = Literal["open", "resolved", "dismissed"]
PLACE_REPORTS_DEFAULT_LIMIT = 20
PLACE_REPORTS_MAX_LIMIT = 50


class PlaceReportCreate(BaseModel):
    """What a member says is wrong about an Atlas spot."""
    model_config = ConfigDict(extra="forbid")

    issues: List[PlaceReportIssue] = Field(..., min_length=1, max_length=6, description="What is wrong")
    comment: Optional[str] = Field(None, max_length=500, description="What it should be")

    @field_validator("issues")
    @classmethod
    def deduplicate(cls, v: List[str]) -> List[str]:
        return list(dict.fromkeys(v))

    @field_validator("comment")
    @classmethod
    def blank_is_none(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() or None if v is not None else None


class PlaceReportCreatedResponse(BaseModel):
    message: str


class ReportedPlace(BaseModel):
    """Every field an admin can correct, as the spot is now."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    city: str
    country: str
    description: Optional[str] = None
    source_url: Optional[str] = None
    place_type_id: int
    place_type: Optional[str] = Field(None, description="Name of the spot type")
    is_valid: bool
    is_moderated: bool


class PlaceReportResponse(BaseModel):
    id: int
    place: ReportedPlace
    issues: List[str]
    comment: Optional[str] = None
    status: PlaceReportStatus
    reporter: Optional[str] = Field(None, description="Username, None once the account is deleted")
    created_at: datetime
    resolved_at: Optional[datetime] = None


class PlaceReportListResponse(BaseModel):
    items: List[PlaceReportResponse]
    total: int
    page: int
    limit: int
    open_count: int = Field(..., description="Open reports, whatever the status listed")
