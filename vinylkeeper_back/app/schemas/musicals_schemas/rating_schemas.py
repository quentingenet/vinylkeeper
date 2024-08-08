from typing import Optional
from pydantic import BaseModel


class RatingBase(BaseModel):
    rating: int
    comment: Optional[str] = None
    album_id: int


class RatingCreate(RatingBase):
    user_id: int


class Rating(RatingBase):
    id: int

    class Config:
        from_attributes = True
