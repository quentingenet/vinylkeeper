from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.place_schema import PlaceTypeResponse
from app.schemas.user_schema import UserMiniResponse


class ModerationStatusResponse(BaseModel):
    """Schema for moderation status response."""
    id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class PlaceMiniResponse(BaseModel):
    """Schema for minimal place data in moderation responses."""
    id: int = Field(gt=0, description="Place ID")
    name: str = Field(description="Place name")
    city: str = Field(description="City")
    country: str = Field(description="Country")
    description: Optional[str] = Field(None, description="Place description")
    place_type: Optional[PlaceTypeResponse] = Field(None, description="Place type")

    model_config = ConfigDict(from_attributes=True)


class ModerationRequestBase(BaseModel):
    """Base schema for moderation request data."""
    place_id: int = Field(
        gt=0,
        description="ID of the place to moderate"
    )
    user_id: int = Field(
        gt=0,
        description="ID of the user who submitted the request"
    )
    status_id: int = Field(
        gt=0,
        description="ID of the moderation status"
    )

    model_config = ConfigDict(from_attributes=True)


class ModerationRequestCreate(ModerationRequestBase):
    """Schema for creating a new moderation request."""
    pass


class ModerationRequestUpdate(BaseModel):
    """Schema for updating a moderation request."""
    status_id: int = Field(
        gt=0,
        description="New status ID for the moderation request"
    )

    model_config = ConfigDict(extra="forbid")


class ModerationRequestInDB(ModerationRequestBase):
    """Schema for moderation request data as stored in database."""
    id: int = Field(
        gt=0,
        description="Unique identifier for the moderation request"
    )
    created_at: datetime = Field(
        description="When the request was created"
    )
    submitted_at: datetime = Field(
        description="When the request was submitted"
    )


class ModerationRequestResponse(ModerationRequestInDB):
    """Schema for moderation request data in API responses."""
    place: Optional[PlaceMiniResponse] = Field(
        None,
        description="Place data associated with this request"
    )
    user: Optional[UserMiniResponse] = Field(
        None,
        description="User data who submitted this request"
    )
    status: Optional[ModerationStatusResponse] = Field(
        None,
        description="Status data of this request"
    )

    model_config = ConfigDict(from_attributes=True)


class ModerationRequestListResponse(BaseModel):
    """Schema for list of moderation requests."""
    items: list[ModerationRequestResponse]
    total: int
    pending_count: int
    approved_count: int
    rejected_count: int
