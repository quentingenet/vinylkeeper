import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.schemas.musicals_schemas.collection_schemas import Collection
from app.schemas.musicals_schemas.rating_schemas import Rating
from app.schemas.musicals_schemas.loan_schemas import Loan
from app.schemas.musicals_schemas.wishlist_schemas import Wishlist


class UserBase(BaseModel):
    username: str
    email: EmailStr

    class Config:
        from_attributes = True


class UserCreate(UserBase):
    password: str
    registered_at: datetime.datetime
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
    timezone: str
    collections: List[Collection] = []
    ratings: List[Rating] = []
    loans: List[Loan] = []
    wishlist_items: List[Wishlist] = []

    class Config:
        from_attributes = True
