from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PlaceLikeBase(BaseModel):
    place_id: int = Field(gt=0)

    model_config = ConfigDict(from_attributes=True)


class PlaceLikeCreate(PlaceLikeBase):
    """Schema for creating a like on a place."""


class PlaceLikeResponse(PlaceLikeBase):
    """Schema for returning a like."""
    id: int = Field(gt=0)
    user_id: int = Field(gt=0)
    created_at: datetime


class PlaceLikeStatusResponse(BaseModel):
    """Schema for place like status response."""
    place_id: int = Field(
        gt=0,
        description="ID of the place"
    )
    liked: bool = Field(
        description="Whether the place is liked by the current user"
    )
    likes_count: int = Field(
        ge=0,
        description="Total number of likes for the place"
    )
    message: str = Field(
        description="Response message"
    )
    is_liked: bool = Field(
        description="Whether the place is liked by the current user (alias for liked)"
    )

    model_config = ConfigDict(from_attributes=True)
