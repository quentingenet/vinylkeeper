from datetime import datetime

from pydantic import BaseModel, Field


class WishlistBase(BaseModel):
    album_id: int

    class Config:
        from_attributes = True


class WishlistCreate(WishlistBase):
    pass


class WishlistUpdate(WishlistBase):
    pass


class Wishlist(WishlistBase):
    id: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        from_attributes = True
