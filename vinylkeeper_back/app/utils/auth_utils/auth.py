import secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path

from fastapi import Request, Depends, Response
import jwt
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional

from app.core.config_env import settings
from app.db.session import get_db
from app.models.user_model import User
from app.repositories.user_repository import UserRepository
from app.core.exceptions import (
    RefreshTokenNotFoundError,
    UnauthorizedError,
    InvalidResetTokenError,
    CsrfValidationError,
)
from app.core.logging import logger

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def load_keys() -> tuple[bytes, bytes]:
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


try:
    PUBLIC_KEY, PRIVATE_KEY = load_keys()
except RuntimeError as e:
    logger.error(f"ERROR: {e}")
    raise

ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES = settings.REFRESH_TOKEN_EXPIRE_MINUTES


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    RESET = "reset"


def create_token(user_uuid: str, token_type: TokenType, token_version: int = 0) -> str:
    """Create a JWT token

    token_version is the user's token_version: bumping it on the user revokes every
    token issued before.
    """
    if token_type == TokenType.ACCESS:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    else:
        expires_delta = timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": user_uuid,
        "exp": expire,
        "type": token_type.value,
        "ver": token_version
    }
    return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: Optional[TokenType] = None) -> dict:
    """Verify a JWT token and return its payload"""
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        if expected_type and payload.get("type") != expected_type.value:
            raise UnauthorizedError("Invalid token type")
        return payload
    except PyJWTError:
        raise UnauthorizedError("Invalid token")


def verify_token(token: str, expected_type: Optional[TokenType] = None) -> str:
    """Verify a JWT token and return the user UUID"""
    return decode_token(token, expected_type)["sub"]


def token_version_of(payload: dict) -> int:
    """Tokens issued before token_version existed carry no "ver": they match version 0"""
    return payload.get("ver", 0)


def check_user_session(user: Optional[User], payload: dict) -> User:
    """Reject a token whose user is gone, disabled, or has revoked it"""
    if not user:
        raise UnauthorizedError("User not found")
    if not user.is_active:
        raise UnauthorizedError("Account is disabled")
    if token_version_of(payload) != user.token_version:
        raise UnauthorizedError("Session revoked")
    return user


def verify_access_token(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedError("Access token not found")
    return verify_token(token, expected_type=TokenType.ACCESS)


def decode_refresh_token(request: Request) -> dict:
    """Verify the refresh token from cookies and return its payload"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise RefreshTokenNotFoundError()

    try:
        payload = jwt.decode(refresh_token, PUBLIC_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != TokenType.REFRESH.value:
            raise UnauthorizedError("Invalid token type")
        return payload
    except PyJWTError:
        raise UnauthorizedError("Invalid refresh token")


def verify_refresh_token(request: Request) -> str:
    """Verify a refresh token from cookies"""
    return decode_refresh_token(request)["sub"]


async def get_refresh_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the user of the refresh token, still existing, active and not revoked"""
    payload = decode_refresh_token(request)
    user = await UserRepository(db).get_user_by_uuid(payload["sub"])
    return check_user_session(user, payload)


def create_reset_token(user_uuid: str, token_version: int = 0) -> str:
    """Create a password reset token, valid until the user's token_version changes"""
    try:
        expire = datetime.now(
            timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": str(user_uuid),
            "exp": expire,
            "type": TokenType.RESET.value,
            "ver": token_version
        }
        return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)
    except Exception as e:
        logger.error("Failed to create reset token", exc_info=True, extra={"error": str(e)})
        raise ValueError("Failed to create reset token")


def verify_reset_token(token: str) -> tuple[str, int]:
    """Verify a password reset token and return the user UUID and its token_version"""
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != TokenType.RESET.value:
            raise InvalidResetTokenError()
        user_uuid = payload.get("sub")
        if not user_uuid:
            raise InvalidResetTokenError()
        return user_uuid, token_version_of(payload)
    except PyJWTError:
        raise InvalidResetTokenError()


def verify_csrf(request: Request) -> None:
    """Verify the double-submit CSRF token for state-changing requests"""
    if request.method in SAFE_METHODS:
        return

    cookie_token = request.cookies.get("csrf_token")
    header_token = request.headers.get("x-csrf-token")
    valid = bool(cookie_token) and bool(header_token) and secrets.compare_digest(
        cookie_token, header_token
    )

    if not valid:
        if settings.CSRF_ENFORCE:
            raise CsrfValidationError()
        logger.warning(
            "CSRF token missing or mismatched (dry-run)",
            extra={"path": request.url.path, "method": request.method}
        )


async def get_current_user(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current user from the access token"""
    user_repository = UserRepository(db)
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedError("No access token provided")
    payload = decode_token(token, expected_type=TokenType.ACCESS)
    verify_csrf(request)
    if not request.cookies.get("csrf_token"):
        set_csrf_cookie(response, generate_csrf_token(), REFRESH_TOKEN_EXPIRE_MINUTES * 60)
    user = await user_repository.get_user_by_uuid(payload["sub"])
    return check_user_session(user, payload)


def set_token_cookie(
    response: Response,
    token: str,
    token_type: TokenType,
    custom_max_age: int | None = None
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
        secure=use_secure_cookie,
        samesite="none" if use_secure_cookie else "lax",
        path="/",
        domain=cookie_domain
    )


def generate_csrf_token() -> str:
    """Generate an opaque random CSRF token"""
    return secrets.token_urlsafe(32)


def set_csrf_cookie(response: Response, token: str, max_age: int) -> None:
    """Set the CSRF cookie, readable by JS for the double-submit pattern"""
    app_env = settings.APP_ENV.lower()
    use_secure_cookie = app_env not in {"development", "local", "test"}
    cookie_domain = (
            settings.COOKIE_DOMAIN
            if use_secure_cookie and settings.COOKIE_DOMAIN
            else None
        )

    response.set_cookie(
        key="csrf_token",
        value=token,
        max_age=max_age,
        httponly=False,
        secure=use_secure_cookie,
        samesite="none" if use_secure_cookie else "lax",
        path="/",
        domain=cookie_domain
    )
