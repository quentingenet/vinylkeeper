from pydantic import BaseModel


class CollectionBase(BaseModel):
    name: str


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(CollectionBase):
    pass


class Collection(CollectionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
