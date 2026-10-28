import re
from datetime import datetime
from uuid import UUID
from email_validator import validate_email, EmailNotValidError

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas import BaseSchema


def _validate_email_value(v: str, check_deliverability: bool = True) -> str:
    try:
        validation = validate_email(v, check_deliverability=check_deliverability)
        # Lowercase: John@x.fr and john@x.fr are the same account
        return validation.normalized.lower()
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
        validate_default=True,
        description="Whether the user has accepted the terms"
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_complexity(v)

    @field_validator("is_accepted_terms")
    @classmethod
    def validate_terms_accepted(cls, v: bool) -> bool:
        # Enforced here too: the frontend checkbox alone can be bypassed
        if not v:
            raise ValueError("You must accept the terms to create an account")
        return v


class RoleResponse(BaseModel):
    """Schema for role data in responses."""
    id: int = Field(gt=0, description="Role ID")
    name: str = Field(description="Role name")

    model_config = ConfigDict(from_attributes=True)


def _normalize_email_lookup(v: str) -> str:
    """Email typed to find an account: no format check, the lookup simply finds nothing."""
    return v.strip().lower()


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

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return _normalize_email_lookup(v)


class ForgotPasswordSchema(BaseModel):
    """Schema for forgot password request."""
    email: str = Field(
        max_length=255,
        description="User's email address"
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return _normalize_email_lookup(v)


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


class EmailChangeRequest(BaseModel):
    """Schema for an email change: applied once confirmed from the new address."""
    model_config = ConfigDict(extra="forbid")

    new_email: str = Field(max_length=255, description="New email address")
    current_password: str = Field(max_length=1024, repr=False, description="Current password")

    @field_validator("new_email")
    @classmethod
    def validate_new_email(cls, v: str) -> str:
        # Same check as at registration, deliverability (DNS) included
        return _validate_email_value(v, check_deliverability=True)


class ConfirmEmailRequest(BaseModel):
    """Schema for the token of a confirmation link."""
    token: str = Field(min_length=1, max_length=2048, description="Token of the confirmation link")


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
    is_email_confirmed: bool = Field(
        description="Whether the user confirmed their email address"
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
