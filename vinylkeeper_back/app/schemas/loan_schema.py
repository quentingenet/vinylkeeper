from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)


class LoanBase(BaseModel):
    """Base schema for loan data."""
    user_id: int = Field(
        gt=0,
        description="ID of the user lending the album"
    )
    album_id: int = Field(
        gt=0,
        description="ID of the album being loaned"
    )
    borrower_name: str = Field(
        min_length=1,
        max_length=255,
        description="Name of the person borrowing the album"
    )
    end_date: Optional[datetime] = Field(
        None,
        description="Expected return date of the album"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("borrower_name")
    @classmethod
    def validate_borrower_name(cls, v: str) -> str:
        """Validate borrower name."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Borrower name cannot be empty")
        return v.strip()

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: Optional[datetime], values: dict) -> Optional[datetime]:
        """Validate that end_date is after start_date if provided."""
        if v is not None and "start_date" in values and v < values["start_date"]:
            raise ValueError("End date must be after start date")
        return v


class LoanCreate(LoanBase):
    """Schema for creating a new loan."""
    pass


class LoanUpdate(BaseModel):
    """Schema for updating a loan."""
    borrower_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )
    end_date: Optional[datetime] = None
    is_returned: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'LoanUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class LoanInDB(LoanBase):
    """Schema for loan data as stored in database."""
    id: int = Field(gt=0)
    start_date: datetime
    is_returned: bool


class LoanResponse(LoanInDB):
    """Schema for loan data in API responses."""
    user: Optional[dict] = None  # Will be populated with user data
    album: Optional[dict] = None  # Will be populated with album data 