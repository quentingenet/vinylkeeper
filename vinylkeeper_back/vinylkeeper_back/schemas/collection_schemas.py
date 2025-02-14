from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: Optional[bool] = False

class CollectionCreate(CollectionBase):
    user_id: int

class CollectionUpdate(CollectionBase):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class CollectionInDBBase(CollectionBase):
    id: int
    user_id: int
    registered_at: datetime

    class Config:
        from_attributes = True

class Collection(CollectionInDBBase):
    pass

class CollectionInDB(CollectionInDBBase):
    pass
