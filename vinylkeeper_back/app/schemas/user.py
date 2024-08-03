from pydantic import BaseModel, EmailStr, constr

class UserBase(BaseModel):
    username: constr(min_length=3, max_length=255)
    email: EmailStr

class UserCreate(UserBase):
    password: constr(min_length=8, max_length=255)

class UserInDB(UserBase):
    hashed_password: str

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool

    class Config:
        from_attributes = True
