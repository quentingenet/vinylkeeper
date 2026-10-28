from pydantic import BaseModel, ConfigDict, Field


class PlaceLikeStatusResponse(BaseModel):
    """Schema for place like status response."""
    place_id: int = Field(
        gt=0,
        description="ID of the place"
    )
    likes_count: int = Field(
        ge=0,
        description="Total number of likes for the place"
    )
    message: str = Field(
        description="Response message"
    )
    is_liked: bool = Field(
        description="Whether the place is liked by the current user"
    )

    model_config = ConfigDict(from_attributes=True)
