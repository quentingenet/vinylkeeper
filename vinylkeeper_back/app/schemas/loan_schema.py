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
    comment: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional comment about the loan"
    )
    start_date: datetime = Field(
        description="When the loan started"
    )
    end_date: Optional[datetime] = Field(
        None,
        description="Expected return date of the album"
    )
    is_active: bool = Field(
        default=True,
        description="Whether the loan is active"
    )
    is_returned: bool = Field(
        default=False,
        description="Whether the album has been returned"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("borrower_name")
    @classmethod
    def validate_borrower_name(cls, v: str) -> str:
        """Validate borrower name."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Borrower name cannot be empty")
        return v.strip()

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        """Validate comment length."""
        if v is not None and len(v) > 255:
            raise ValueError("Comment cannot be longer than 255 characters")
        return v

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
    comment: Optional[str] = Field(
        None,
        max_length=255
    )
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
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
    id: int = Field(
        gt=0,
        description="Unique identifier for the loan"
    )
    loaned_at: datetime = Field(
        description="When the loan was created"
    )
    returned_at: Optional[datetime] = Field(
        None,
        description="When the album was returned"
    )


class LoanResponse(LoanInDB):
    """Schema for loan data in API responses."""
    user: Optional[dict] = Field(
        None,
        description="User data who lent the album"
    )
    album: Optional[dict] = Field(
        None,
        description="Album data being loaned"
    )
