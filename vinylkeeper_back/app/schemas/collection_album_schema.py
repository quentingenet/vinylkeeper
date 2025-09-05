from datetime import datetime
from typing import Optional, Union
import re

from pydantic import Field, model_validator, field_validator

from app.schemas import BaseSchema
from app.core.enums import VinylStateEnum


class CollectionAlbumCreate(BaseSchema):
    """Schema for adding an album to a collection with metadata."""
    album_id: int = Field(..., gt=0, description="ID of the album")
    collection_id: int = Field(..., gt=0, description="ID of the collection")
    state_record: Optional[VinylStateEnum] = Field(
        None, description="State of the vinyl record (mint, near_mint, very_good_plus, etc.)")
    state_cover: Optional[VinylStateEnum] = Field(
        None, description="State of the album cover (mint, near_mint, very_good_plus, etc.)")
    acquisition_month_year: Optional[str] = Field(
        None, description="Acquisition month and year in format YYYY-MM (e.g., '2024-06')")

    @field_validator("acquisition_month_year")
    @classmethod
    def validate_acquisition_month_year(cls, v):
        """Validate acquisition_month_year format"""
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("acquisition_month_year must be a string")
        
        # Check format YYYY-MM
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError("acquisition_month_year must be in format YYYY-MM (e.g., '2024-06')")
        
        # Validate year and month
        year, month = v.split('-')
        year_int = int(year)
        month_int = int(month)
        
        if year_int < 1900 or year_int > 2100:
            raise ValueError("Year must be between 1900 and 2100")
        
        if month_int < 1 or month_int > 12:
            raise ValueError("Month must be between 01 and 12")
        
        return v


class CollectionAlbumUpdate(BaseSchema):
    """Schema for updating album metadata in a collection."""
    state_record: Optional[VinylStateEnum] = Field(
        None, description="Updated vinyl state (mint, near_mint, very_good_plus, etc.)")
    state_cover: Optional[VinylStateEnum] = Field(
        None, description="Updated cover state (mint, near_mint, very_good_plus, etc.)")
    acquisition_month_year: Optional[str] = Field(
        None, description="Updated acquisition month and year in format YYYY-MM (e.g., '2024-06')")

    @field_validator("acquisition_month_year")
    @classmethod
    def validate_acquisition_month_year(cls, v):
        """Validate acquisition_month_year format"""
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("acquisition_month_year must be a string")
        
        # Check format YYYY-MM
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError("acquisition_month_year must be in format YYYY-MM (e.g., '2024-06')")
        
        # Validate year and month
        year, month = v.split('-')
        year_int = int(year)
        month_int = int(month)
        
        if year_int < 1900 or year_int > 2100:
            raise ValueError("Year must be between 1900 and 2100")
        
        if month_int < 1 or month_int > 12:
            raise ValueError("Month must be between 01 and 12")
        
        return v

    @model_validator(mode="after")
    def at_least_one_field_provided(self) -> 'CollectionAlbumUpdate':
        """Ensure at least one field is provided for partial update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class CollectionAlbumMetadataResponse(BaseSchema):
    """Schema for returning collection-album metadata."""
    collection_id: int = Field(..., gt=0)
    album_id: int = Field(..., gt=0)
    state_record: Optional[VinylStateEnum] = None
    state_cover: Optional[VinylStateEnum] = None
    acquisition_month_year: Optional[str] = None
