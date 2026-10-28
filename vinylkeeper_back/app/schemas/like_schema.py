from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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
