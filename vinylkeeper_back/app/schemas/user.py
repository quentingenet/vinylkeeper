import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    username: str
    email: EmailStr

    class Config:
        arbitrary_types_allowed = True
        from_attributes = True


class UserCreate(UserBase):
    password: str
    registered_at: datetime.datetime = datetime.datetime.utcnow()
    is_accepted_terms: bool
    is_active: bool = True
    is_superuser: bool = False
    timezone: str = 'UTC'


class UserUpdate(UserBase):
    password: Optional[str] = None
    last_login: Optional[datetime.datetime] = None
    timezone: Optional[str] = 'UTC'


class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime.datetime] = None
    registered_at: datetime.datetime

    class Config:
        arbitrary_types_allowed = True
        from_attributes = True
