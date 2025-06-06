from datetime import datetime
from typing import Optional, List
from uuid import UUID
import zoneinfo
from email_validator import validate_email, EmailNotValidError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.enums import RoleEnum


class UserBase(BaseModel):
    """Base schema for user data."""
    username: str = Field(
        min_length=3,
        max_length=255,
        pattern="^[a-zA-Z0-9_-]+$",
        description="Username must contain only letters, numbers, underscores and hyphens"
    )
    email: EmailStr
    timezone: str = Field(
        default="Europe/Paris",
        pattern="^[A-Za-z]+/[A-Za-z_]+$",
        description="Timezone must be in IANA format (e.g., Europe/Paris)"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username format and content."""
        if not v:
            raise ValueError("Username cannot be empty")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if not v.isalnum() and not all(c in "_-" for c in v):
            raise ValueError("Username can only contain letters, numbers, underscores and hyphens")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format and domain."""
        try:
            validation = validate_email(v, check_deliverability=True)
            return validation.normalized
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email format: {str(e)}")

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        """Validate timezone format."""
        if not v:
            raise ValueError("Timezone cannot be empty")
        if "/" not in v:
            raise ValueError("Invalid timezone format. Must be in IANA format (e.g., Europe/Paris)")
        return v


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(
        min_length=8,
        max_length=255,
        description="Password must be at least 8 characters long"
    )
    is_accepted_terms: bool = Field(default=False)
    role_id: int = Field(gt=0)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=255,
        pattern="^[a-zA-Z0-9_-]+$"
    )
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(
        None,
        min_length=8,
        max_length=255
    )
    timezone: Optional[str] = Field(
        None,
        pattern="^[A-Za-z]+/[A-Za-z_]+$"
    )
    is_active: Optional[bool] = None
    is_accepted_terms: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'UserUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class UserInDB(UserBase):
    """Schema for user data as stored in database."""
    id: int = Field(gt=0)
    user_uuid: UUID
    is_accepted_terms: bool
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    registered_at: datetime
    number_of_connections: int = Field(ge=0)
    role_id: int = Field(gt=0)


class UserResponse(UserInDB):
    """Schema for user data in API responses."""
    role: dict  # Will be populated with role data
    collections_count: int = Field(default=0)
    liked_collections_count: int = Field(default=0)
    loans_count: int = Field(default=0)
    wishlist_items_count: int = Field(default=0)


class UserDetailResponse(UserResponse):
    """Detailed user response including related data."""
    collections: List[dict] = Field(default_factory=list)
    liked_collections: List[dict] = Field(default_factory=list)
    loans: List[dict] = Field(default_factory=list)
    wishlist_items: List[dict] = Field(default_factory=list) 