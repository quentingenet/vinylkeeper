from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path

from fastapi import Request, Depends, Response
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer
from typing import Optional

from app.core.config_env import settings
from app.db.session import get_db
from app.models.user_model import User
from app.repositories.user_repository import UserRepository
from app.core.exceptions import RefreshTokenNotFoundError, UnauthorizedError, InvalidResetTokenError
from app.core.logging import logger


# Load keys
def load_keys():
    """Load JWT keys with error handling"""
    base_path = Path(__file__).parent.parent.parent / "keys"
    try:
        with open(base_path / "public_key.pem", "rb") as key_file:
            public_key = key_file.read()
        with open(base_path / "private_key.pem", "rb") as key_file:
            private_key = key_file.read()
        return public_key, private_key
    except FileNotFoundError as e:
        raise RuntimeError(
            f"JWT keys not found in {base_path}. Please ensure public_key.pem and private_key.pem exist. Error: {e}"
        )


# Load keys with error handling
try:
    PUBLIC_KEY, PRIVATE_KEY = load_keys()
except RuntimeError as e:
    logger.error(f"ERROR: {e}")
    raise

# Use global settings instance
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES = settings.REFRESH_TOKEN_EXPIRE_MINUTES

security = HTTPBearer()


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    RESET = "reset"


# Create a JWT token with an explicit token type
def create_token(user_uuid: str, token_type: TokenType) -> str:
    """Create a JWT token"""
    if token_type == TokenType.ACCESS:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    else:
        expires_delta = timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": user_uuid,
        "exp": expire,
        "type": token_type.value
    }
    return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)


# Decode and validate a token, ensuring correct type
def verify_token(token: str, expected_type: Optional[TokenType] = None) -> str:
    """Verify a JWT token and return the user UUID"""
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        if expected_type and payload.get("type") != expected_type.value:
            raise UnauthorizedError("Invalid token type")
        return payload["sub"]
    except JWTError:
        raise UnauthorizedError("Invalid token")


# Verify an access token from cookies
def verify_access_token(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedError("Access token not found")
    return verify_token(token, expected_type=TokenType.ACCESS)


# Verify a refresh token from cookies
def verify_refresh_token(request: Request) -> str:
    """Verify a refresh token from cookies"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise RefreshTokenNotFoundError()

    try:
        payload = jwt.decode(refresh_token, PUBLIC_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != TokenType.REFRESH.value:
            raise UnauthorizedError("Invalid token type")
        return payload["sub"]
    except JWTError:
        raise UnauthorizedError("Invalid refresh token")


# Create a short-lived reset token for password reset
def create_reset_token(user_uuid: str) -> str:
    try:
        expire = datetime.now(
            timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
        to_encode = {"sub": str(user_uuid), "exp": expire, "type": TokenType.RESET.value}
        return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)
    except Exception as e:
        raise ValueError(f"Failed to create reset token: {str(e)}")


# Verify a password reset token
def verify_reset_token(token: str) -> str:
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != TokenType.RESET.value:
            raise InvalidResetTokenError()
        user_uuid = payload.get("sub")
        if not user_uuid:
            raise InvalidResetTokenError()
        return user_uuid
    except JWTError:
        raise InvalidResetTokenError()


# Retrieve the current user from access token
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current user from the access token"""
    user_repository = UserRepository(db)
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedError("No access token provided")
    user_uuid = verify_token(token, expected_type=TokenType.ACCESS)
    user = await user_repository.get_user_by_uuid(user_uuid)
    if not user:
        raise UnauthorizedError("User not found")
    return user


# Set a token in cookie with appropriate attributes
def set_token_cookie(
    response: Response,
    token: str,
    token_type: TokenType,
    custom_max_age: Optional[int] = None
) -> None:
    """Set a token cookie"""
    if token_type == TokenType.ACCESS:
        max_age = custom_max_age or ACCESS_TOKEN_EXPIRE_MINUTES * 60
    else:
        max_age = custom_max_age or REFRESH_TOKEN_EXPIRE_MINUTES * 60

    app_env = settings.APP_ENV.lower()
    use_secure_cookie = app_env not in {"development", "local", "test"}
    cookie_domain = (
            settings.COOKIE_DOMAIN
            if use_secure_cookie and settings.COOKIE_DOMAIN
            else None
        )


    response.set_cookie(
        key=f"{token_type.value}_token",
        value=token,
        max_age=max_age,
        httponly=True,
        secure= use_secure_cookie,
        samesite="none" if use_secure_cookie else "lax",
        path="/",
        domain=cookie_domain
    )
