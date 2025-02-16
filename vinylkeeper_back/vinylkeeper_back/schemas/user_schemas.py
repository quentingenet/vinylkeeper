from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    username: constr(min_length=3, max_length=255)
    email: EmailStr
    is_accepted_terms: bool
    is_active: bool = True
    is_superuser: bool = False
    timezone: str = "UTC+1"
    #role_id: Optional[int]

class EmailUpdatePassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: constr(min_length=4)

class CreateUser(UserBase):
    password: constr(min_length=4)

class AuthUser(BaseModel):
    email: EmailStr
    password: constr(min_length=4)

class UserUpdate(BaseModel):
    username: Optional[constr(min_length=3, max_length=255)]
    email: Optional[EmailStr]
    password: Optional[constr(min_length=4)]
    is_accepted_terms: Optional[bool]
    is_active: Optional[bool]
    is_superuser: Optional[bool]
    timezone: Optional[str]
    role_id: Optional[int]

class UserInDBBase(UserBase):
    id: int
    user_uuid: UUID
    registered_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    password: str