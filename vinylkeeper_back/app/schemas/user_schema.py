import re
from datetime import datetime
from typing import Optional
from uuid import UUID
from email_validator import validate_email, EmailNotValidError

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas import BaseSchema


def _validate_email_value(v: str, check_deliverability: bool = True) -> str:
    try:
        validation = validate_email(v, check_deliverability=check_deliverability)
        return validation.normalized
    except EmailNotValidError as e:
        raise ValueError(f"Invalid email format: {str(e)}")


def _validate_username_value(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Username cannot be empty")
    if len(v) < 2:
        raise ValueError("Username must contain at least 2 characters")
    if not re.match(r'^[a-z0-9._-]+$', v):
        raise ValueError(
            "Username can only contain lowercase letters, numbers, dots (.), hyphens (-), and underscores (_)")
    if v.startswith(('.', '-', '_')) or v.endswith(('.', '-', '_')):
        raise ValueError(
            "Username cannot start or end with dots, hyphens, or underscores")
    return v


def _validate_password_complexity(v: str) -> str:
    if not v:
        raise ValueError("New password cannot be empty")
    if len(v) < 4:
        raise ValueError("Password must contain at least 4 characters")
    if not any(c.isalpha() for c in v):
        raise ValueError("Password must contain at least one letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one number")
    return v


class UserBase(BaseSchema):
    """Base schema for user data."""
    username: str = Field(
        min_length=2,
        max_length=50,
        description="Username must be between 2 and 50 characters"
    )
    email: str = Field(
        max_length=255,
        description="Email address"
    )
    timezone: str = Field(
        default="Europe/Paris",
        max_length=100,
        description="Timezone in IANA format (e.g., Europe/Paris)"
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        return _validate_username_value(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email_value(v, check_deliverability=True)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        """Validate timezone format."""
        if not v:
            raise ValueError("Timezone cannot be empty")
        if "/" not in v:
            raise ValueError("Invalid timezone format")
        return v


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(
        max_length=1024,
        description="User password",
        repr=False
    )
    is_accepted_terms: bool = Field(
        default=False,
        description="Whether the user has accepted the terms"
    )
    role_id: int = Field(
        default=2,
        gt=0,
        description="ID of the user's role (defaults to regular user)"
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_complexity(v)


class UserUpdate(BaseSchema):
    """Schema for updating a user."""
    username: Optional[str] = Field(
        None,
        min_length=2,
        max_length=50,
        description="Username must be between 2 and 50 characters"
    )
    email: Optional[str] = Field(
        None,
        max_length=255
    )
    password: Optional[str] = Field(
        None,
        max_length=1024,
        repr=False
    )
    timezone: Optional[str] = Field(
        None,
        max_length=100
    )
    is_active: Optional[bool] = None
    is_accepted_terms: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validate_username_value(v)
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validate_email_value(v, check_deliverability=False)
        return v


class UserInDB(UserBase):
    """Schema for user data as stored in database."""
    id: int = Field(
        gt=0,
        description="Unique identifier for the user"
    )
    user_uuid: UUID = Field(
        description="Unique UUID for the user"
    )
    is_accepted_terms: bool = Field(
        description="Whether the user has accepted the terms"
    )
    is_active: bool = Field(
        description="Whether the user account is active"
    )
    is_superuser: bool = Field(
        description="Whether the user is a superuser"
    )
    last_login: Optional[datetime] = Field(
        None,
        description="When the user last logged in"
    )
    created_at: datetime = Field(
        description="When the user was created"
    )
    number_of_connections: int = Field(
        ge=0,
        description="Number of times the user has connected"
    )
    role_id: int = Field(
        gt=0,
        description="ID of the user's role"
    )


class RoleResponse(BaseModel):
    """Schema for role data in responses."""
    id: int = Field(gt=0, description="Role ID")
    name: str = Field(description="Role name")

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserInDB):
    """Schema for user data in API responses."""
    role: RoleResponse = Field(
        description="Role data"
    )
    collections_count: int = Field(
        default=0,
        description="Number of collections owned by the user"
    )
    loans_count: int = Field(
        default=0,
        description="Number of loans made by the user"
    )

    model_config = ConfigDict(from_attributes=True)


class UserAuthSchema(BaseModel):
    """Schema for user authentication."""
    email: str = Field(
        max_length=255,
        description="User's email address"
    )
    password: str = Field(
        max_length=1024,
        description="User's password",
        repr=False
    )


class ForgotPasswordSchema(BaseModel):
    """Schema for forgot password request."""
    email: str = Field(
        max_length=255,
        description="User's email address"
    )


class ResetPasswordSchema(BaseModel):
    """Schema for password reset."""
    token: str = Field(
        description="Reset password token"
    )
    new_password: str = Field(
        max_length=1024,
        description="New password",
        repr=False
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password_complexity(v)


class PasswordChangeSchema(BaseModel):
    """Schema for password change request."""
    current_password: str = Field(
        max_length=1024,
        description="Current password",
        repr=False
    )
    new_password: str = Field(
        max_length=1024,
        description="New password",
        repr=False
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password_complexity(v)


class UserMeResponse(BaseModel):
    """Schema for /me endpoint response - secure data for frontend."""
    username: str = Field(
        description="User's username"
    )
    user_uuid: UUID = Field(
        description="User's UUID"
    )
    is_admin: bool = Field(
        description="Whether the user has admin privileges"
    )
    is_tutorial_seen: bool = Field(
        default=False,
        description="Whether the user has seen the tutorial"
    )
    number_of_connections: int = Field(
        default=0,
        description="Number of times the user has connected"
    )

    model_config = ConfigDict(from_attributes=True)


class UserMiniResponse(BaseSchema):
    """Minimal user response schema (no id - only UUID for frontend security)."""
    username: str = Field(
        description="User's username"
    )
    user_uuid: UUID = Field(
        description="User's UUID"
    )


class UserSettingsResponse(BaseSchema):
    """Schema for /me/settings endpoint response - only fields used by frontend."""
    username: str = Field(
        description="User's username"
    )
    email: str = Field(
        description="User's email"
    )
    user_uuid: UUID = Field(
        description="User's UUID"
    )
    created_at: datetime = Field(
        description="When the user was created"
    )
    is_accepted_terms: bool = Field(
        description="Whether the user has accepted the terms"
    )


class ContactMessageRequest(BaseSchema):
    """Schema for contact message request."""
    subject: str = Field(..., min_length=1, max_length=200,
                         description="Message subject")
    message: str = Field(..., min_length=1, max_length=2000,
                         description="Message content")


class ContactMessageResponse(BaseModel):
    """Schema for contact message response."""
    message: str = Field(description="Success message")
    sent_at: datetime = Field(description="Timestamp when message was sent")

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Generic single-message response for operations that return only a status message."""
    message: str = Field(description="Operation result message")


class LoginResponse(BaseModel):
    """Response schema for /auth endpoint."""
    isLoggedIn: bool = Field(description="Whether the user is now logged in")


class RegisterResponse(BaseModel):
    """Response schema for /register endpoint."""
    message: str = Field(description="Registration result message")
    isLoggedIn: bool = Field(description="Whether the user is now logged in")


class TokenRefreshResponse(BaseModel):
    """Response schema for /refresh-token endpoint."""
    message: str = Field(description="Token refresh result message")
    isLoggedIn: bool = Field(description="Whether the user is still logged in")
