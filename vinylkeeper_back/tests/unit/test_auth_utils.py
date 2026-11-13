import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import jwt

from app.utils.auth_utils.auth import (
    get_optional_user,
    ALGORITHM,
    PRIVATE_KEY,
    TokenType,
    create_reset_token,
    create_access_token,
    get_current_user,
    set_token_cookie,
    bearer_token,
    decode_refresh_token,
    verify_reset_token,
    verify_token,
)
from tests.conftest import make_legacy_refresh_token
from app.core.exceptions import RefreshTokenNotFoundError, InvalidResetTokenError, UnauthorizedError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_request(cookies: dict, method: str = "GET") -> MagicMock:
    request = MagicMock()
    request.method = method
    request.cookies.get = lambda key, default=None: cookies.get(key, default)
    return request


def make_expired_token(user_uuid: str, token_type: TokenType) -> str:
    expire = datetime.now(timezone.utc) - timedelta(minutes=1)
    payload = {"sub": user_uuid, "exp": expire, "type": token_type.value}
    return jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# create_access_token / verify_token
# ---------------------------------------------------------------------------

class TestVerifyToken:
    def test_access_round_trip(self):
        token = create_access_token("uuid-123")
        assert verify_token(token, expected_type=TokenType.ACCESS) == "uuid-123"

    def test_refresh_round_trip(self):
        token = make_legacy_refresh_token("uuid-123")
        assert verify_token(token, expected_type=TokenType.REFRESH) == "uuid-123"

    def test_no_expected_type_accepts_any(self):
        token = create_access_token("uuid-123")
        assert verify_token(token) == "uuid-123"

    def test_wrong_type_raises(self):
        token = make_legacy_refresh_token("uuid-123")
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
# decode_refresh_token
# ---------------------------------------------------------------------------

class TestDecodeRefreshToken:
    def test_valid_cookie(self, regular_user):
        token = make_legacy_refresh_token(str(regular_user.user_uuid))
        request = make_request({"refresh_token": token})
        assert decode_refresh_token(request)["sub"] == str(regular_user.user_uuid)

    def test_missing_cookie_raises_refresh_not_found(self):
        request = make_request({})
        with pytest.raises(RefreshTokenNotFoundError):
            decode_refresh_token(request)

    def test_access_token_in_refresh_cookie_raises(self, regular_user):
        token = create_access_token(str(regular_user.user_uuid))
        request = make_request({"refresh_token": token})
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            decode_refresh_token(request)

    def test_garbage_token_raises(self):
        request = make_request({"refresh_token": "garbage"})
        with pytest.raises(UnauthorizedError, match="Invalid refresh token"):
            decode_refresh_token(request)

    def test_expired_token_raises(self, regular_user):
        token = make_expired_token(str(regular_user.user_uuid), TokenType.REFRESH)
        request = make_request({"refresh_token": token})
        with pytest.raises(UnauthorizedError):
            decode_refresh_token(request)


# ---------------------------------------------------------------------------
# create_reset_token / verify_reset_token
# ---------------------------------------------------------------------------

class TestResetToken:
    def test_round_trip(self):
        token = create_reset_token("uuid-456", 3)
        assert verify_reset_token(token) == ("uuid-456", 3)

    def test_access_token_as_reset_raises(self):
        token = create_access_token("uuid-456")
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
# set_token_cookie
# ---------------------------------------------------------------------------

class TestSetTokenCookie:
    @pytest.mark.parametrize("app_env", ["development", "local", "test"])
    def test_non_production_envs_use_local_cookie_attributes(self, app_env):
        response = MagicMock()
        token = create_access_token("uuid-123")

        with patch("app.utils.auth_utils.auth.settings.APP_ENV", app_env):
            set_token_cookie(response, token, TokenType.ACCESS)

        response.set_cookie.assert_called_once()
        cookie_kwargs = response.set_cookie.call_args.kwargs
        assert cookie_kwargs["key"] == "access_token"
        assert cookie_kwargs["secure"] is False
        assert cookie_kwargs["samesite"] == "lax"

    def test_production_env_uses_secure_cross_site_cookie_attributes(self):
        response = MagicMock()
        token = create_access_token("uuid-123")

        with patch("app.utils.auth_utils.auth.settings.APP_ENV", "production"):
            set_token_cookie(response, token, TokenType.ACCESS)

        response.set_cookie.assert_called_once()
        cookie_kwargs = response.set_cookie.call_args.kwargs
        assert cookie_kwargs["key"] == "access_token"
        assert cookie_kwargs["secure"] is True
        assert cookie_kwargs["samesite"] == "none"

    def test_production_cookies_carry_every_attribute(self):
        """The full set_cookie call of each session cookie in production, as the browser gets it."""
        from app.utils.auth_utils.auth import (
            ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_MINUTES, set_csrf_cookie,
        )
        response = MagicMock()

        with patch("app.utils.auth_utils.auth.settings.APP_ENV", "production"), \
                patch("app.utils.auth_utils.auth.settings.COOKIE_DOMAIN", ".example.org"):
            set_token_cookie(response, "a", TokenType.ACCESS)
            set_token_cookie(response, "r", TokenType.REFRESH)
            set_csrf_cookie(response, "c", 60)

        common = {"secure": True, "samesite": "none", "path": "/", "domain": ".example.org"}
        assert [call.kwargs for call in response.set_cookie.call_args_list] == [
            {"key": "access_token", "value": "a", "max_age": ACCESS_TOKEN_EXPIRE_MINUTES * 60, "httponly": True,
             **common},
            {"key": "refresh_token", "value": "r", "max_age": REFRESH_TOKEN_EXPIRE_MINUTES * 60, "httponly": True,
             **common},
            # Read by the web app for the double-submit check
            {"key": "csrf_token", "value": "c", "max_age": 60, "httponly": False, **common},
        ]

    def test_no_cookie_domain_outside_production(self):
        from app.utils.auth_utils.auth import set_csrf_cookie
        response = MagicMock()

        with patch("app.utils.auth_utils.auth.settings.APP_ENV", "development"), \
                patch("app.utils.auth_utils.auth.settings.COOKIE_DOMAIN", ".example.org"):
            set_csrf_cookie(response, "c", 60)

        assert response.set_cookie.call_args.kwargs["domain"] is None

# ---------------------------------------------------------------------------
# get_current_user
# ---------------------------------------------------------------------------


class TestGetCurrentUser:
    async def test_returns_user_with_valid_token(self, regular_user):
        token = create_access_token(str(regular_user.user_uuid))
        request = make_request({"access_token": token})
        mock_repo = AsyncMock()
        mock_repo.get_user_by_uuid = AsyncMock(return_value=regular_user)

        with patch("app.utils.auth_utils.auth.UserRepository", return_value=mock_repo):
            result = await get_current_user(request, response=MagicMock(), db=AsyncMock())

        assert result is regular_user

    async def test_missing_cookie_raises(self):
        request = make_request({})
        with pytest.raises(UnauthorizedError, match="No access token provided"):
            await get_current_user(request, response=MagicMock(), db=AsyncMock())

    async def test_user_not_in_db_raises(self, regular_user):
        token = create_access_token(str(regular_user.user_uuid))
        request = make_request({"access_token": token})
        mock_repo = AsyncMock()
        mock_repo.get_user_by_uuid = AsyncMock(return_value=None)

        with patch("app.utils.auth_utils.auth.UserRepository", return_value=mock_repo):
            with pytest.raises(UnauthorizedError, match="User not found"):
                await get_current_user(request, response=MagicMock(), db=AsyncMock())

    async def test_invalid_token_raises(self):
        request = make_request({"access_token": "bad.token"})
        with pytest.raises(UnauthorizedError):
            await get_current_user(request, response=MagicMock(), db=AsyncMock())

    async def _current_user_with(self, token: str, user):
        request = make_request({"access_token": token})
        mock_repo = AsyncMock()
        mock_repo.get_user_by_uuid = AsyncMock(return_value=user)
        with patch("app.utils.auth_utils.auth.UserRepository", return_value=mock_repo):
            return await get_current_user(request, response=MagicMock(), db=AsyncMock())

    async def test_disabled_user_raises(self, regular_user):
        regular_user.is_active = False
        token = create_access_token(str(regular_user.user_uuid))
        with pytest.raises(UnauthorizedError, match="Account is disabled"):
            await self._current_user_with(token, regular_user)

    async def test_token_of_an_older_version_raises(self, regular_user):
        token = create_access_token(str(regular_user.user_uuid), 0)
        regular_user.token_version = 1
        with pytest.raises(UnauthorizedError, match="Session revoked"):
            await self._current_user_with(token, regular_user)

    async def test_token_of_the_current_version_is_accepted(self, regular_user):
        regular_user.token_version = 4
        token = create_access_token(str(regular_user.user_uuid), 4)
        assert await self._current_user_with(token, regular_user) is regular_user

    async def test_token_issued_before_versions_counts_as_version_0(self, regular_user):
        expire = datetime.now(timezone.utc) + timedelta(minutes=5)
        legacy = jwt.encode(
            {"sub": str(regular_user.user_uuid), "exp": expire, "type": "access"}, PRIVATE_KEY, algorithm=ALGORITHM
        )
        assert await self._current_user_with(legacy, regular_user) is regular_user

    async def test_refresh_token_in_access_cookie_raises(self, regular_user):
        token = make_legacy_refresh_token(str(regular_user.user_uuid))
        request = make_request({"access_token": token})
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            await get_current_user(request, response=MagicMock(), db=AsyncMock())


class TestGetOptionalUser:
    """Pages open to visitors (the Vinyl Atlas): no session is a visitor, not an error."""

    async def test_no_session_is_a_visitor(self):

        request = MagicMock()
        request.cookies = {}
        db = AsyncMock()

        assert await get_optional_user(request, MagicMock(), db) is None
        db.execute.assert_not_called()

    async def test_an_expired_session_is_still_refused(self):

        request = MagicMock()
        request.cookies = {"access_token": "not-a-valid-token"}

        with pytest.raises(UnauthorizedError):
            await get_optional_user(request, MagicMock(), AsyncMock())


# ---------------------------------------------------------------------------
# Bearer header (native app)
# ---------------------------------------------------------------------------

def make_bearer_request(authorization, cookies: dict = None, method: str = "GET") -> MagicMock:
    request = make_request(cookies or {}, method)
    request.headers.get = lambda key, default=None: authorization if key == "authorization" else default
    return request


class TestBearerToken:
    def test_reads_the_token(self):
        assert bearer_token(make_bearer_request("Bearer abc.def")) == "abc.def"

    def test_scheme_is_case_insensitive(self):
        assert bearer_token(make_bearer_request("bearer abc")) == "abc"

    def test_other_scheme_is_ignored(self):
        assert bearer_token(make_bearer_request("Basic dXNlcjpwYXNz")) is None

    def test_empty_token_is_ignored(self):
        assert bearer_token(make_bearer_request("Bearer ")) is None

    def test_no_header(self):
        assert bearer_token(make_bearer_request(None)) is None

    def test_refresh_token_read_from_the_header(self, regular_user):
        token = make_legacy_refresh_token(str(regular_user.user_uuid))
        assert decode_refresh_token(make_bearer_request(f"Bearer {token}"))["sub"] == str(regular_user.user_uuid)

    def test_access_token_as_bearer_refresh_is_refused(self, regular_user):
        token = create_access_token(str(regular_user.user_uuid))
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            decode_refresh_token(make_bearer_request(f"Bearer {token}"))


class TestIsAdmin:
    @pytest.mark.parametrize("role_name, is_superuser, expected", [
        ("admin", True, True),
        ("admin", False, False),
        ("user", True, False),
        (None, True, False),
    ])
    def test_needs_the_admin_role_and_the_superuser_flag(self, role_name, is_superuser, expected):
        from app.utils.auth_utils.auth import is_admin

        user = MagicMock(is_superuser=is_superuser)
        user.role = None if role_name is None else MagicMock()
        if role_name:
            user.role.name = role_name

        assert is_admin(user) is expected
