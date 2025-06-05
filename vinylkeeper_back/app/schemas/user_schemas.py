from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base schema for user data."""
    username: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    timezone: str = Field(default="UTC+1", max_length=100)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        """Validate timezone format."""
        if not v.startswith(("UTC+", "UTC-")):
            raise ValueError("Timezone must be in format UTC±XX")
        return v


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8)
    is_accepted_terms: bool = Field(default=False)
    role_id: int = Field(..., gt=0)

    @field_validator("is_accepted_terms")
    @classmethod
    def validate_terms(cls, v: bool) -> bool:
        """Ensure terms are accepted for new users."""
        if not v:
            raise ValueError("Terms must be accepted to create an account")
        return v


class UserUpdate(UserBase):
    """Schema for updating user data."""
    username: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    timezone: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    role_id: Optional[int] = Field(None, gt=0)

    model_config = ConfigDict(extra="forbid")


class UserInDB(UserBase):
    """Schema for user data as stored in database."""
    id: int = Field(..., gt=0)
    user_uuid: UUID
    is_accepted_terms: bool
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    registered_at: datetime
    number_of_connections: int = Field(..., ge=0)
    role_id: int = Field(..., gt=0)

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserInDB):
    """Schema for user data in API responses."""
    role: dict  # Will be populated with role data
    collections_count: int = Field(default=0)
    liked_collections_count: int = Field(default=0)
    ratings_count: int = Field(default=0)
    loans_count: int = Field(default=0)
    wishlist_items_count: int = Field(default=0)

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(UserResponse):
    """Detailed user response including related data."""
    collections: List[dict] = Field(default_factory=list)
    liked_collections: List[dict] = Field(default_factory=list)
    ratings: List[dict] = Field(default_factory=list)
    loans: List[dict] = Field(default_factory=list)
    wishlist_items: List[dict] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
