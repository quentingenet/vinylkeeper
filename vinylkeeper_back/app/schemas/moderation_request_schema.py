from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ModerationStatusEnum


class ModerationRequestBase(BaseModel):
    """Base schema for moderation request data."""
    place_id: int = Field(gt=0)
    status: ModerationStatusEnum = Field(default=ModerationStatusEnum.pending)

    model_config = ConfigDict(from_attributes=True)


class ModerationRequestCreate(ModerationRequestBase):
    """Schema for creating a new moderation request."""
    pass


class ModerationRequestUpdate(BaseModel):
    """Schema for updating a moderation request."""
    status: ModerationStatusEnum

    model_config = ConfigDict(extra="forbid")


class ModerationRequestInDB(ModerationRequestBase):
    """Schema for moderation request data as stored in database."""
    id: int = Field(gt=0)
    submitted_at: datetime


class ModerationRequestResponse(ModerationRequestInDB):
    """Schema for moderation request data in API responses."""
    place: Optional[dict] = None  # Will be populated with place data 