from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class LikeBase(BaseModel):
    """Base schema for like data."""
    user_id: int = Field(
        gt=0,
        description="ID of the user who liked the collection"
    )
    collection_id: int = Field(
        gt=0,
        description="ID of the collection being liked"
    )

    model_config = ConfigDict(from_attributes=True)


class LikeCreate(LikeBase):
    """Schema for creating a new like."""
    pass


class LikeInDB(LikeBase):
    """Schema for like data as stored in database."""
    id: int = Field(
        gt=0,
        description="Unique identifier for the like"
    )
    created_at: datetime = Field(
        description="When the like was created"
    )


class LikeResponse(LikeInDB):
    """Schema for like data in API responses."""
    pass


class LikeStatusResponse(BaseModel):
    """Schema for like status response."""
    collection_id: int = Field(
        gt=0,
        description="ID of the collection"
    )
    liked: bool = Field(
        description="Whether the collection is liked by the current user"
    )
    likes_count: int = Field(
        ge=0,
        description="Total number of likes for the collection"
    )
    last_liked_at: Optional[datetime] = Field(
        None,
        description="When the collection was last liked"
    )

    model_config = ConfigDict(from_attributes=True)
