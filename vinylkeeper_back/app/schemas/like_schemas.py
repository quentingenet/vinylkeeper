from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class LikeBase(BaseModel):
    """Base schema for like data."""
    user_id: int = Field(..., gt=0)
    collection_id: int = Field(..., gt=0)


class LikeCreate(LikeBase):
    """Schema for creating a new like."""
    pass


class LikeInDB(LikeBase):
    """Schema for like data as stored in database."""
    id: int = Field(..., gt=0)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LikeResponse(LikeInDB):
    """Schema for like data in API responses."""
    pass


class LikeStatusResponse(BaseModel):
    """Schema for like status response."""
    collection_id: int = Field(..., gt=0)
    liked: bool
    likes_count: int = Field(..., ge=0)
    last_liked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)