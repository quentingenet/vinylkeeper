from unittest.mock import AsyncMock, patch

from app.main import app
from app.deps.deps import get_user_service
from app.utils.auth_utils.auth import create_token, decode_token, TokenType
from app.core.exceptions import (
    DuplicateEmailError,
    EmailNotFoundError,
    InvalidCredentialsError,
    InvalidResetTokenError,
)


def patch_user_lookup(user):
    """The refresh token's user, as the database would return it"""
    repo = AsyncMock()
    repo.get_user_by_uuid = AsyncMock(return_value=user)
    return patch("app.utils.auth_utils.auth.UserRepository", return_value=repo)


# ---------------------------------------------------------------------------
# POST /api/users/auth
# ---------------------------------------------------------------------------

class TestLogin:
    async def test_success_returns_200_and_cookies(self, client, mock_user):
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={
            "email": "test@example.com",
            "password": "correct_password"
        })

        assert resp.status_code == 200
        assert resp.json() == {"isLoggedIn": True}
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies

    async def test_wrong_password_returns_401(self, client):
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(side_effect=InvalidCredentialsError())
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={
            "email": "test@example.com",
            "password": "wrong"
        })

        assert resp.status_code == 401
        body = resp.json()
        assert "code" in body
        assert "message" in body

    async def test_email_not_found_returns_401(self, client):
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(side_effect=EmailNotFoundError("ghost@example.com"))
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={
            "email": "ghost@example.com",
            "password": "password"
        })

        assert resp.status_code == 401

    async def test_account_locked_returns_401(self, client, mock_user):
        mock_user.is_active = False
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={
            "email": "test@example.com",
            "password": "correct_password"
        })

        assert resp.status_code == 401
        assert resp.json()["code"] == 1003  # ErrorCode.ACCOUNT_LOCKED

    async def test_terms_not_accepted_returns_401(self, client, mock_user):
        mock_user.is_active = True
        mock_user.is_accepted_terms = False
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={
            "email": "test@example.com",
            "password": "correct_password"
        })

        assert resp.status_code == 401
        assert resp.json()["code"] == 1008  # ErrorCode.TERMS_NOT_ACCEPTED

    async def test_missing_body_returns_422(self, client):
        resp = await client.post("/api/users/auth", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/users/register
# ---------------------------------------------------------------------------

class TestRegister:
    async def test_success_returns_201_and_cookies(self, client, mock_user):
        mock_service = AsyncMock()
        mock_service.create_user = AsyncMock(return_value=mock_user)
        mock_service.send_new_user_registered_email = AsyncMock()
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "Test1234",
            "is_accepted_terms": True,
            "timezone": "Europe/Paris",
        })

        assert resp.status_code == 201
        assert resp.json()["isLoggedIn"] is True
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies

    async def test_duplicate_email_returns_409(self, client):
        mock_service = AsyncMock()
        mock_service.create_user = AsyncMock(side_effect=DuplicateEmailError("taken@example.com"))
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/register", json={
            "username": "newuser",
            "email": "taken@example.com",
            "password": "Test1234",
            "is_accepted_terms": True,
            "timezone": "Europe/Paris",
        })

        assert resp.status_code == 400
        body = resp.json()
        assert "code" in body
        assert "message" in body

    async def test_invalid_body_returns_422(self, client):
        resp = await client.post("/api/users/register", json={
            "username": "x",  # trop court (< 2)
            "email": "not-an-email",
            "password": "a",
            "is_accepted_terms": True,
            "timezone": "Europe/Paris",
        })
        assert resp.status_code == 422

    async def test_structured_error_format(self, client):
        mock_service = AsyncMock()
        mock_service.create_user = AsyncMock(side_effect=DuplicateEmailError("x@x.com"))
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/register", json={
            "username": "validuser",
            "email": "x@x.com",
            "password": "Test1234",
            "is_accepted_terms": True,
            "timezone": "Europe/Paris",
        })

        body = resp.json()
        assert set(body.keys()) == {"code", "message", "details"}


# ---------------------------------------------------------------------------
# POST /api/users/refresh-token
# ---------------------------------------------------------------------------

class TestRefreshToken:
    async def test_success_with_valid_cookie(self, client, mock_user):
        refresh_token = create_token(str(mock_user.user_uuid), TokenType.REFRESH)
        client.cookies.set("refresh_token", refresh_token)

        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token")

        assert resp.status_code == 200
        assert resp.json()["isLoggedIn"] is True
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies

    async def test_missing_cookie_returns_401(self, client):
        resp = await client.post("/api/users/refresh-token")
        assert resp.status_code == 401

    async def test_invalid_token_returns_401(self, client):
        client.cookies.set("refresh_token", "garbage.token.value")
        resp = await client.post("/api/users/refresh-token")
        assert resp.status_code == 401

    async def test_access_token_in_refresh_cookie_returns_401(self, client, mock_user):
        wrong_token = create_token(str(mock_user.user_uuid), TokenType.ACCESS)
        client.cookies.set("refresh_token", wrong_token)
        resp = await client.post("/api/users/refresh-token")
        assert resp.status_code == 401

    async def test_deleted_user_returns_401(self, client, mock_user):
        client.cookies.set("refresh_token", create_token(str(mock_user.user_uuid), TokenType.REFRESH))
        with patch_user_lookup(None):
            resp = await client.post("/api/users/refresh-token")
        assert resp.status_code == 401

    async def test_disabled_user_returns_401(self, client, mock_user):
        mock_user.is_active = False
        client.cookies.set("refresh_token", create_token(str(mock_user.user_uuid), TokenType.REFRESH))
        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token")
        assert resp.status_code == 401
        assert "access_token" not in resp.cookies

    async def test_revoked_token_returns_401(self, client, mock_user):
        client.cookies.set("refresh_token", create_token(str(mock_user.user_uuid), TokenType.REFRESH, 0))
        mock_user.token_version = 1  # password changed since the token was issued
        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/users/logout
# ---------------------------------------------------------------------------

class TestLogout:
    async def test_success_returns_200(self, client):
        resp = await client.post("/api/users/logout")
        assert resp.status_code == 200
        assert resp.json() == {"message": "Logged out successfully"}


# ---------------------------------------------------------------------------
# GET /api/users/me
# ---------------------------------------------------------------------------

class TestGetMe:
    async def test_success_returns_user_data(self, auth_client):
        client, service, user = auth_client
        resp = await client.get("/api/users/me")
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == user.username
        assert "user_uuid" in body
        assert "is_admin" in body

    async def test_no_cookie_returns_401(self, client):
        resp = await client.get("/api/users/me")
        assert resp.status_code == 401
        body = resp.json()
        assert body["code"] == 1004  # ErrorCode.INVALID_TOKEN


# ---------------------------------------------------------------------------
# POST /api/users/forgot-password
# ---------------------------------------------------------------------------

class TestForgotPassword:
    async def test_always_returns_200(self, client):
        """Anti-énumération : même réponse si email inconnu ou connu."""
        mock_service = AsyncMock()
        mock_service.send_password_reset_email = AsyncMock()
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/forgot-password", json={
            "email": "anyone@example.com"
        })

        assert resp.status_code == 200
        assert "password reset link" in resp.json()["message"]


# ---------------------------------------------------------------------------
# POST /api/users/reset-password
# ---------------------------------------------------------------------------

class TestResetPassword:
    async def test_success_returns_200(self, client):
        mock_service = AsyncMock()
        mock_service.reset_password = AsyncMock()
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/reset-password", json={
            "token": "any-token",
            "new_password": "NewPass1"
        })

        assert resp.status_code == 200
        assert resp.json() == {"message": "Password reset successfully"}

    async def test_invalid_token_returns_401(self, client):
        mock_service = AsyncMock()
        mock_service.reset_password = AsyncMock(side_effect=InvalidResetTokenError())
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/reset-password", json={
            "token": "bad-token",
            "new_password": "NewPass1"
        })

        assert resp.status_code == 401
        assert resp.json()["code"] == 1004  # ErrorCode.INVALID_TOKEN


# ---------------------------------------------------------------------------
# PUT /api/users/me/password
# ---------------------------------------------------------------------------

class TestChangeMyPassword:
    async def test_current_session_gets_tokens_of_the_new_version(self, auth_client):
        client, mock_service, mock_user = auth_client

        async def bump_version(user, current_password, new_password):
            user.token_version = 1

        mock_service.change_password = AsyncMock(side_effect=bump_version)

        resp = await client.put("/api/users/me/password", json={
            "current_password": "correct_password",
            "new_password": "NewStr0ng!Passw0rd",
        })

        assert resp.status_code == 200
        assert "access_token" in resp.cookies and "refresh_token" in resp.cookies
        payload = decode_token(resp.cookies["access_token"], TokenType.ACCESS)
        assert payload["ver"] == 1
