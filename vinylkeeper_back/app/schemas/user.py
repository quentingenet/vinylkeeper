import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserUpdate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    last_login: datetime.datetime
    registered_at: datetime.datetime

    class Config:
        from_attributes = True
