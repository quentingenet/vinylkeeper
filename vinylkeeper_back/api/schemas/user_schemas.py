from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=255,
        pattern=r'^[a-z0-9]+$',
        description="Username must contain only uppercase letters, lowercase letters, and numbers."
    )
    email: EmailStr
    is_accepted_terms: bool
    is_active: bool = True
    is_superuser: bool = False
    timezone: str = "UTC+1"

class EmailUpdatePassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(
        min_length=4,
        max_length=64,
        pattern=r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:,.<>?]{4,64}$',
        description="Password must be between 4 and 64 characters, and can contain letters, numbers and special characters."
    )

class CreateUser(UserBase):
    password: str = Field(
        min_length=4,
        max_length=64,
        pattern=r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:,.<>?]{4,64}$',
        description="Password must be between 4 and 64 characters, and can contain letters, numbers and special characters."
    )

class AuthUser(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=4,
        max_length=64,
        pattern=r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:,.<>?]{4,64}$',
        description="Password must be between 4 and 64 characters, and can contain letters, numbers and special characters."
    )

class UserUpdate(BaseModel):
    username: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=255,
        pattern=r'^[a-z0-9]+$',
        description="Username must contain only lowercase letters and numbers."
    )
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(
        default=None,
        min_length=4,
        max_length=64,
        pattern=r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:,.<>?]{4,64}$',
        description="Password must be between 4 and 64 characters, and can contain letters, numbers and special characters."
    )
    is_accepted_terms: Optional[bool] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    timezone: Optional[str] = None
    role_id: Optional[int] = None

class UserInDBBase(UserBase):
    id: int
    user_uuid: UUID
    registered_at: datetime
    last_login: Optional[datetime] = None
    number_of_connections: int

    model_config = ConfigDict(from_attributes=True)

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    password: str
