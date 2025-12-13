from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.user_schema import UserMiniResponse


class PlaceTypeResponse(BaseModel):
    """Schema for place type data in responses."""
    id: int = Field(gt=0, description="Place type ID")
    name: str = Field(description="Place type name")

    model_config = ConfigDict(from_attributes=True)


class PlaceBase(BaseModel):
    """Base schema for place data."""
    name: str = Field(min_length=1, max_length=255)
    address: str = Field(max_length=255)
    city: str = Field(max_length=100)
    country: str = Field(max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    description: Optional[str] = Field(None, max_length=600)
    source_url: Optional[str] = Field(None, max_length=255)

    model_config = ConfigDict(from_attributes=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("Place name cannot be empty")
        return v.strip()

    @field_validator("latitude", "longitude")
    @classmethod
    def validate_coordinates(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not isinstance(v, (int, float)):
            raise ValueError("Coordinates must be numeric values")
        return v


class PlaceCreate(PlaceBase):
    """Schema for creating a new place."""
    place_type_id: str = Field(min_length=1, max_length=50)
    submitted_by_id: Optional[int] = Field(None, gt=0)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class PlaceUpdate(BaseModel):
    """Schema for updating a place."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    description: Optional[str] = Field(None, max_length=600)
    source_url: Optional[str] = Field(None, max_length=255)
    place_type_id: Optional[str] = Field(None, min_length=1, max_length=50)
    is_moderated: Optional[bool] = Field(None)
    is_valid: Optional[bool] = Field(None)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'PlaceUpdate':
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class PlaceInDB(PlaceBase):
    """Schema for place data as stored in database."""
    id: int = Field(gt=0)
    place_type_id: int = Field(gt=0)
    submitted_by_id: Optional[int] = Field(None, gt=0)
    is_moderated: bool
    is_valid: bool
    created_at: datetime
    updated_at: datetime


class PlaceResponse(PlaceInDB):
    """Schema for place data in API responses (includes all fields for admins)."""
    submitted_by: Optional[UserMiniResponse] = None
    place_type: Optional[PlaceTypeResponse] = None
    likes_count: int = Field(
        default=0, description="Number of likes for this place")
    is_liked: bool = Field(
        default=False, description="Whether the current user has liked this place")

    model_config = ConfigDict(from_attributes=True)


class PublicPlaceResponse(PlaceBase):
    """Schema for public place data (only moderated places)."""
    id: int = Field(gt=0)
    place_type: Optional[PlaceTypeResponse] = None
    likes_count: int = Field(
        default=0, description="Number of likes for this place")
    is_liked: bool = Field(
        default=False, description="Whether the current user has liked this place")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaceMapResponse(BaseModel):
    """Ultra-lightweight schema for map markers (only geographic data + city)."""
    id: int = Field(gt=0, description="Place ID")
    latitude: float = Field(ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(
        ge=-180, le=180, description="Longitude coordinate")
    city: Optional[str] = Field(None, description="City name")

    model_config = ConfigDict(from_attributes=True)
