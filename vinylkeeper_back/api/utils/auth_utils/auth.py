from datetime import datetime, timedelta, timezone
from enum import Enum
from http.client import HTTPException
from jose import jwt, JWTError
from api.core.config_env import Settings
import os
from fastapi import Request, Depends, status, Response
from api.db.session import get_db
from api.schemas.user_schemas import User
from api.repositories.user_repository import UserRepository
from sqlalchemy.orm import Session


base_path = "./keys"
public_key_path = os.path.join(base_path, "public_key.pem")
private_key_path = os.path.join(base_path, "private_key.pem")

with open(public_key_path, "rb") as key_file:
    PUBLIC_KEY = key_file.read()

with open(private_key_path, "rb") as key_file:
    PRIVATE_KEY = key_file.read()

ALGORITHM = Settings().ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Settings().ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES = Settings().REFRESH_TOKEN_EXPIRE_MINUTES

class TokenType(Enum):
    ACCESS = "access"
    REFRESH = "refresh"

class AuthUtils:
    def get_user_repository() -> UserRepository:
        return UserRepository()

    def __init__(self, user_repository: UserRepository = Depends(get_user_repository)):
        self.user_repository = user_repository

def create_token(user_uuid: str, token_type: TokenType) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {"sub": user_uuid, "exp": expire}
    if token_type == TokenType.ACCESS:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    elif token_type == TokenType.REFRESH:
        expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)

def verify_token(request: Request) -> str:
    try:
        token = request.cookies.get("refresh_token") or request.cookies.get("access_token")
        if not token:
            raise ValueError("Invalid token")
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        user_uuid: str = payload.get("sub")
        if user_uuid is None or user_uuid == "":
            raise ValueError("Invalid token")
        return user_uuid
    except JWTError:
        raise ValueError("Invalid token")

def create_reset_token(user_uuid: str) -> str:
    try:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode = {"sub": str(user_uuid), "exp": expire}
        return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)
    except Exception as e:
        raise ValueError(f"Failed to create reset token: {str(e)}")

def verify_reset_token(token: str) -> str:
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        user_uuid: str = payload.get("sub")
        if user_uuid is None or user_uuid == "":
            raise ValueError("Invalid token")
        return user_uuid
    except JWTError:
        raise ValueError("Invalid token")

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    user_repository = UserRepository(db)
    try:
        user_uuid = verify_token(request)
        if not user_uuid:
            raise ValueError("Invalid token")
        
        user = user_repository.get_user_by_uuid(user_uuid)
        if not user:
            raise ValueError("Invalid token")
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

def set_token_cookie(response: Response, token: str, token_type: TokenType, custom_max_age: int = None):
    max_age = custom_max_age if custom_max_age is not None else (
        Settings().ACCESS_TOKEN_EXPIRE_MINUTES if token_type == TokenType.ACCESS 
        else Settings().REFRESH_TOKEN_EXPIRE_MINUTES) * 60
    
    response.set_cookie(
        key=f"{token_type.value}_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=max_age,
        path="/",
        domain=Settings().COOKIE_DOMAIN if Settings().APP_ENV != "development" else None
    )
