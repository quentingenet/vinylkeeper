from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)


class PlaceBase(BaseModel):
    """Base schema for place data."""
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Place name must be between 1 and 255 characters"
    )
    address: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional address, maximum 255 characters"
    )
    city: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional city name, maximum 100 characters"
    )
    country: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional country name, maximum 100 characters"
    )
    latitude: float = Field(
        ge=-90,
        le=90,
        description="Latitude coordinate (-90 to 90)"
    )
    longitude: float = Field(
        ge=-180,
        le=180,
        description="Longitude coordinate (-180 to 180)"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate place name."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Place name cannot be empty")
        return v.strip()

    @field_validator("latitude", "longitude")
    @classmethod
    def validate_coordinates(cls, v: float) -> float:
        """Validate coordinate values."""
        if not isinstance(v, (int, float)):
            raise ValueError("Coordinates must be numeric values")
        return v


class PlaceCreate(PlaceBase):
    """Schema for creating a new place."""
    submitted_by_id: Optional[int] = Field(
        None,
        gt=0,
        description="ID of the user submitting the place"
    )


class PlaceUpdate(BaseModel):
    """Schema for updating a place."""
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )
    address: Optional[str] = Field(
        None,
        max_length=255
    )
    city: Optional[str] = Field(
        None,
        max_length=100
    )
    country: Optional[str] = Field(
        None,
        max_length=100
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90,
        le=90
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180,
        le=180
    )
    is_verified: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'PlaceUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class PlaceInDB(PlaceBase):
    """Schema for place data as stored in database."""
    id: int = Field(gt=0)
    submitted_by_id: Optional[int] = Field(None, gt=0)
    is_verified: bool
    created_at: datetime


class PlaceResponse(PlaceInDB):
    """Schema for place data in API responses."""
    submitted_by: Optional[dict] = None  # Will be populated with user data
