from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserInfo(BaseModel):
    id: int
    username: str
    
    class Config:
        from_attributes = True

class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: Optional[bool] = False

class CollectionCreate(CollectionBase):
    user_id: int
    registered_at: datetime

class SwitchAreaRequest(BaseModel):
    is_public: bool
    
class CollectionUpdate(CollectionBase):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_public: bool
    user_id: int
    registered_at: datetime
    updated_at: datetime
    owner: UserInfo
    
    class Config:
        from_attributes = True

class CollectionInDBBase(CollectionBase):
    id: int
    user_id: int
    registered_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class Collection(CollectionInDBBase):
    pass

class CollectionInDB(CollectionInDBBase):
    pass
