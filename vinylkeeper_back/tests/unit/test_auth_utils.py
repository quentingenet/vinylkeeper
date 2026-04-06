import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from jose import jwt

from app.utils.auth_utils.auth import (
    ALGORITHM,
    PRIVATE_KEY,
    TokenType,
    create_reset_token,
    create_token,
    get_current_user,
    verify_access_token,
    verify_refresh_token,
    verify_reset_token,
    verify_token,
)
from app.core.exceptions import RefreshTokenNotFoundError, InvalidResetTokenError, UnauthorizedError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_request(cookies: dict) -> MagicMock:
    request = MagicMock()
    request.cookies.get = lambda key, default=None: cookies.get(key, default)
    return request


def make_expired_token(user_uuid: str, token_type: TokenType) -> str:
    expire = datetime.now(timezone.utc) - timedelta(minutes=1)
    payload = {"sub": user_uuid, "exp": expire, "type": token_type.value}
    return jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# create_token / verify_token
# ---------------------------------------------------------------------------

class TestVerifyToken:
    def test_access_round_trip(self):
        token = create_token("uuid-123", TokenType.ACCESS)
        assert verify_token(token, expected_type=TokenType.ACCESS) == "uuid-123"

    def test_refresh_round_trip(self):
        token = create_token("uuid-123", TokenType.REFRESH)
        assert verify_token(token, expected_type=TokenType.REFRESH) == "uuid-123"

    def test_no_expected_type_accepts_any(self):
        token = create_token("uuid-123", TokenType.ACCESS)
        assert verify_token(token) == "uuid-123"

    def test_wrong_type_raises(self):
        token = create_token("uuid-123", TokenType.REFRESH)
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            verify_token(token, expected_type=TokenType.ACCESS)

    def test_garbage_token_raises(self):
        with pytest.raises(UnauthorizedError, match="Invalid token"):
            verify_token("not.a.valid.token", expected_type=TokenType.ACCESS)

    def test_expired_token_raises(self):
        token = make_expired_token("uuid-123", TokenType.ACCESS)
        with pytest.raises(UnauthorizedError, match="Invalid token"):
            verify_token(token, expected_type=TokenType.ACCESS)


# ---------------------------------------------------------------------------
# verify_access_token
# ---------------------------------------------------------------------------

class TestVerifyAccessToken:
    def test_valid_cookie(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.ACCESS)
        request = make_request({"access_token": token})
        assert verify_access_token(request) == str(regular_user.user_uuid)

    def test_missing_cookie_raises(self):
        request = make_request({})
        with pytest.raises(UnauthorizedError, match="Access token not found"):
            verify_access_token(request)

    def test_refresh_token_in_access_cookie_raises(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.REFRESH)
        request = make_request({"access_token": token})
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            verify_access_token(request)

    def test_expired_token_raises(self, regular_user):
        token = make_expired_token(str(regular_user.user_uuid), TokenType.ACCESS)
        request = make_request({"access_token": token})
        with pytest.raises(UnauthorizedError):
            verify_access_token(request)


# ---------------------------------------------------------------------------
# verify_refresh_token
# ---------------------------------------------------------------------------

class TestVerifyRefreshToken:
    def test_valid_cookie(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.REFRESH)
        request = make_request({"refresh_token": token})
        assert verify_refresh_token(request) == str(regular_user.user_uuid)

    def test_missing_cookie_raises_refresh_not_found(self):
        request = make_request({})
        with pytest.raises(RefreshTokenNotFoundError):
            verify_refresh_token(request)

    def test_access_token_in_refresh_cookie_raises(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.ACCESS)
        request = make_request({"refresh_token": token})
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            verify_refresh_token(request)

    def test_garbage_token_raises(self):
        request = make_request({"refresh_token": "garbage"})
        with pytest.raises(UnauthorizedError, match="Invalid refresh token"):
            verify_refresh_token(request)

    def test_expired_token_raises(self, regular_user):
        token = make_expired_token(str(regular_user.user_uuid), TokenType.REFRESH)
        request = make_request({"refresh_token": token})
        with pytest.raises(UnauthorizedError):
            verify_refresh_token(request)


# ---------------------------------------------------------------------------
# create_reset_token / verify_reset_token
# ---------------------------------------------------------------------------

class TestResetToken:
    def test_round_trip(self):
        token = create_reset_token("uuid-456")
        assert verify_reset_token(token) == "uuid-456"

    def test_access_token_as_reset_raises(self):
        token = create_token("uuid-456", TokenType.ACCESS)
        with pytest.raises(InvalidResetTokenError):
            verify_reset_token(token)

    def test_garbage_raises(self):
        with pytest.raises(InvalidResetTokenError):
            verify_reset_token("garbage.token.here")

    def test_expired_raises(self):
        token = make_expired_token("uuid-456", TokenType.RESET)
        with pytest.raises(InvalidResetTokenError):
            verify_reset_token(token)


# ---------------------------------------------------------------------------
# get_current_user
# ---------------------------------------------------------------------------

class TestGetCurrentUser:
    async def test_returns_user_with_valid_token(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.ACCESS)
        request = make_request({"access_token": token})
        mock_repo = AsyncMock()
        mock_repo.get_user_by_uuid = AsyncMock(return_value=regular_user)

        with patch("app.utils.auth_utils.auth.UserRepository", return_value=mock_repo):
            result = await get_current_user(request, db=AsyncMock())

        assert result is regular_user

    async def test_missing_cookie_raises(self):
        request = make_request({})
        with pytest.raises(UnauthorizedError, match="No access token provided"):
            await get_current_user(request, db=AsyncMock())

    async def test_user_not_in_db_raises(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.ACCESS)
        request = make_request({"access_token": token})
        mock_repo = AsyncMock()
        mock_repo.get_user_by_uuid = AsyncMock(return_value=None)

        with patch("app.utils.auth_utils.auth.UserRepository", return_value=mock_repo):
            with pytest.raises(UnauthorizedError, match="User not found"):
                await get_current_user(request, db=AsyncMock())

    async def test_invalid_token_raises(self):
        request = make_request({"access_token": "bad.token"})
        with pytest.raises(UnauthorizedError):
            await get_current_user(request, db=AsyncMock())

    async def test_refresh_token_in_access_cookie_raises(self, regular_user):
        token = create_token(str(regular_user.user_uuid), TokenType.REFRESH)
        request = make_request({"access_token": token})
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            await get_current_user(request, db=AsyncMock())
