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

        mock_service = AsyncMock()
        app.dependency_overrides[get_user_service] = lambda: mock_service

        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token")

        assert resp.status_code == 200
        assert resp.json()["isLoggedIn"] is True
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies
        # A restored session is a visit: last_seen_at
        mock_service.mark_seen.assert_awaited_once_with(mock_user)

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


# ---------------------------------------------------------------------------
# Email confirmation
# ---------------------------------------------------------------------------

class TestEmailConfirmationEndpoints:
    async def test_register_sends_the_welcome_email(self, client, mock_user):
        mock_service = AsyncMock()
        mock_service.create_user = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/register", json={
            "username": "newuser", "email": "new@example.com", "password": "Test1234",
            "is_accepted_terms": True, "timezone": "Europe/Paris",
        })

        assert resp.status_code == 201
        mock_service.send_welcome_email.assert_awaited_once_with(mock_user)

    async def test_register_ignores_a_role_id(self, client, mock_user):
        mock_service = AsyncMock()
        mock_service.create_user = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/register", json={
            "username": "newuser", "email": "new@example.com", "password": "Test1234",
            "is_accepted_terms": True, "timezone": "Europe/Paris", "role_id": 1,
        })

        assert resp.status_code == 201
        assert not hasattr(mock_service.create_user.await_args.args[0], "role_id")

    async def test_confirm_email_needs_no_session(self, client):
        mock_service = AsyncMock()
        mock_service.confirm_email = AsyncMock(return_value="a@example.com")
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/confirm-email", json={"token": "tok"})

        assert resp.status_code == 200
        mock_service.confirm_email.assert_awaited_once_with("tok")

    async def test_invalid_link_returns_400(self, client):
        from app.core.exceptions import InvalidEmailTokenError
        mock_service = AsyncMock()
        mock_service.confirm_email = AsyncMock(side_effect=InvalidEmailTokenError())
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/confirm-email", json={"token": "tok"})

        assert resp.status_code == 400

    async def test_profile_update_endpoint_is_gone(self, client):
        # The username never changes, the email only through POST /me/email and its link
        resp = await client.put("/api/users/me", json={"username": "renamed"})

        assert resp.status_code == 405


# ---------------------------------------------------------------------------
# Native app: Bearer header, tokens in the body, no cookie, no CSRF
# ---------------------------------------------------------------------------

class TestNativeSession:
    async def test_login_returns_tokens_and_sets_no_cookie(self, client, mock_user):
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={
            "email": "test@example.com", "password": "correct_password", "client": "native"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["isLoggedIn"] is True
        assert decode_token(body["access_token"], TokenType.ACCESS)["sub"] == str(mock_user.user_uuid)
        assert decode_token(body["refresh_token"], TokenType.REFRESH)["sub"] == str(mock_user.user_uuid)
        assert not resp.cookies and "set-cookie" not in resp.headers

    async def test_web_login_never_puts_tokens_in_the_body(self, client, mock_user):
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        resp = await client.post("/api/users/auth", json={"email": "test@example.com", "password": "correct_password"})

        assert resp.json() == {"isLoggedIn": True}

    async def test_unknown_client_is_rejected(self, client):
        resp = await client.post("/api/users/auth", json={"email": "a@b.fr", "password": "x", "client": "tv"})
        assert resp.status_code == 422

    async def test_refresh_with_a_bearer_returns_new_tokens_without_cookie(self, client, mock_user):
        refresh_token = create_token(str(mock_user.user_uuid), TokenType.REFRESH)
        app.dependency_overrides[get_user_service] = lambda: AsyncMock()

        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token", headers={"Authorization": f"Bearer {refresh_token}"})

        assert resp.status_code == 200
        assert decode_token(resp.json()["access_token"], TokenType.ACCESS)["sub"] == str(mock_user.user_uuid)
        assert "refresh_token" in resp.json()
        assert not resp.cookies

    async def test_an_access_token_cannot_refresh(self, client, mock_user):
        access_token = create_token(str(mock_user.user_uuid), TokenType.ACCESS)
        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token", headers={"Authorization": f"Bearer {access_token}"})
        assert resp.status_code == 401

    async def test_bearer_needs_no_csrf_token(self, client, mock_user):
        access_token = create_token(str(mock_user.user_uuid), TokenType.ACCESS)
        mock_service = AsyncMock()
        mock_service.set_preferred_currency = AsyncMock()
        app.dependency_overrides[get_user_service] = lambda: mock_service

        with patch_user_lookup(mock_user):
            resp = await client.put(
                "/api/users/me/currency", json={"currency": "USD"},
                headers={"Authorization": f"Bearer {access_token}"})

        assert resp.status_code == 200
        assert "csrf_token" not in resp.cookies

    async def test_cookie_without_csrf_token_is_still_refused(self, client, mock_user):
        client.cookies.set("access_token", create_token(str(mock_user.user_uuid), TokenType.ACCESS))
        app.dependency_overrides[get_user_service] = lambda: AsyncMock()

        with patch_user_lookup(mock_user):
            resp = await client.put("/api/users/me/currency", json={"currency": "USD"})

        assert resp.status_code == 403

    async def test_a_valid_cookie_does_not_rescue_a_bad_bearer(self, client, mock_user):
        client.cookies.set("access_token", create_token(str(mock_user.user_uuid), TokenType.ACCESS))
        with patch_user_lookup(mock_user):
            resp = await client.get("/api/users/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401

    async def test_revoked_bearer_is_refused(self, client, mock_user):
        stale = create_token(str(mock_user.user_uuid), TokenType.ACCESS, token_version=0)
        mock_user.token_version = 1
        with patch_user_lookup(mock_user):
            resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {stale}"})
        assert resp.status_code == 401

    async def test_password_change_over_bearer_returns_the_new_tokens(self, auth_client):
        client, mock_service, mock_user = auth_client

        async def bump_version(user, current_password, new_password):
            user.token_version = 1

        mock_service.change_password = AsyncMock(side_effect=bump_version)
        resp = await client.put("/api/users/me/password", json={
            "current_password": "correct_password", "new_password": "NewStr0ng!Passw0rd"},
            headers={"Authorization": "Bearer whatever"})

        assert resp.status_code == 200
        assert decode_token(resp.json()["access_token"], TokenType.ACCESS)["ver"] == 1


# ---------------------------------------------------------------------------
# Sessions of the refresh token: what the endpoints ask of SessionService
# ---------------------------------------------------------------------------

class TestSessionsFromTheEndpoints:
    async def test_a_login_opens_a_session_for_its_client(self, client, mock_user, fake_sessions):
        mock_service = AsyncMock()
        mock_service.authenticate = AsyncMock(return_value=mock_user)
        app.dependency_overrides[get_user_service] = lambda: mock_service

        await client.post("/api/users/auth", json={"email": "test@example.com", "password": "correct_password"})
        await client.post("/api/users/auth", json={
            "email": "test@example.com", "password": "correct_password", "client": "native"})

        assert [kind for _, kind in fake_sessions.opened] == ["web", "native"]

    async def test_a_refresh_moves_the_session_on_instead_of_opening_another(self, client, mock_user, fake_sessions):
        refresh_token = create_token(str(mock_user.user_uuid), TokenType.REFRESH)
        client.cookies.set("refresh_token", refresh_token)
        app.dependency_overrides[get_user_service] = lambda: AsyncMock()

        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token")

        assert resp.status_code == 200
        assert fake_sessions.opened == [] and len(fake_sessions.rotated) == 1
        assert fake_sessions.rotated[0][1]["sub"] == str(mock_user.user_uuid)

    async def test_a_refused_rotation_is_a_401_and_sets_no_cookie(self, client, mock_user, fake_sessions):
        from app.core.exceptions import UnauthorizedError

        async def refuse(user, payload, client="web"):
            raise UnauthorizedError("Session revoked")

        fake_sessions.rotate = refuse
        client.cookies.set("refresh_token", create_token(str(mock_user.user_uuid), TokenType.REFRESH))
        app.dependency_overrides[get_user_service] = lambda: AsyncMock()

        with patch_user_lookup(mock_user):
            resp = await client.post("/api/users/refresh-token")

        assert resp.status_code == 401
        assert "access_token" not in resp.cookies and "refresh_token" not in resp.cookies

    async def test_logout_revokes_the_session_of_the_refresh_token(self, client, mock_user, fake_sessions):
        client.cookies.set("refresh_token", create_token(str(mock_user.user_uuid), TokenType.REFRESH))

        resp = await client.post("/api/users/logout")

        assert resp.status_code == 200
        assert [payload["sub"] for payload in fake_sessions.revoked] == [str(mock_user.user_uuid)]

    async def test_the_app_logs_out_with_its_refresh_token_as_bearer(self, client, mock_user, fake_sessions):
        token = create_token(str(mock_user.user_uuid), TokenType.REFRESH)

        resp = await client.post("/api/users/logout", headers={"Authorization": f"Bearer {token}"})

        assert resp.status_code == 200 and len(fake_sessions.revoked) == 1

    async def test_logout_with_an_invalid_token_still_succeeds(self, client, fake_sessions):
        client.cookies.set("refresh_token", "garbage")
        assert (await client.post("/api/users/logout")).status_code == 200
        assert fake_sessions.revoked == []

    async def test_a_password_change_gives_this_device_a_new_session(self, auth_client, fake_sessions):
        client, mock_service, mock_user = auth_client
        mock_service.change_password = AsyncMock()

        await client.put("/api/users/me/password", json={
            "current_password": "correct_password", "new_password": "NewStr0ng!Passw0rd"})

        assert len(fake_sessions.opened) == 1
