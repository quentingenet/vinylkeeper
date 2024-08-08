from pydantic import BaseModel


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

    class Config:
        from_attributes = True
