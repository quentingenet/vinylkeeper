"""
Rotation of the refresh token, on the real database: renewed at every refresh, a copied one detected.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update

from app.core.exceptions import UnauthorizedError
from app.db.session import get_db
from app.main import app
from app.models.refresh_session_model import RefreshSession
from app.repositories.refresh_session_repository import RefreshSessionRepository
from app.services.session_service import GRACE_PERIOD, SessionService
from app.utils.auth_utils.auth import TokenType, decode_token
from tests.conftest import make_legacy_refresh_token
from tests.integration.conftest import make_real_test_user


@pytest.fixture
def sessions(real_session):
    return SessionService(RefreshSessionRepository(real_session))


def payload_of(token: str) -> dict:
    return decode_token(token, TokenType.REFRESH)


async def row_of(real_session, token: str) -> RefreshSession:
    query = select(RefreshSession).where(RefreshSession.id == payload_of(token)["sid"])
    return (await real_session.execute(query.execution_options(populate_existing=True))).scalar_one()


async def age_rotation(real_session, token: str, by: timedelta) -> None:
    """The last renewal happened `by` ago."""
    await real_session.execute(
        update(RefreshSession).where(RefreshSession.id == payload_of(token)["sid"])
        .values(rotated_at=datetime.now(timezone.utc) - by))


class TestOpenAndRotate:
    async def test_a_login_opens_a_session_whose_token_carries_it(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        token = await sessions.open(user, "native")

        payload = payload_of(token)
        row = await row_of(real_session, token)
        assert payload["sub"] == str(user.user_uuid) and payload["ver"] == user.token_version
        assert (str(row.id), row.current_jti, row.client, row.user_id) == (
            payload["sid"], payload["jti"], "native", user.id)

    async def test_a_refresh_gives_the_next_token_and_remembers_the_one_before(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)

        second = await sessions.rotate(user, payload_of(first))

        row = await row_of(real_session, second)
        assert payload_of(second)["sid"] == payload_of(first)["sid"], "same session"
        assert payload_of(second)["jti"] != payload_of(first)["jti"]
        assert (row.current_jti, row.previous_jti) == (payload_of(second)["jti"], payload_of(first)["jti"])

    async def test_the_session_slides_on_every_refresh(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        await real_session.execute(update(RefreshSession).where(RefreshSession.id == payload_of(first)["sid"])
                                   .values(expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))

        await sessions.rotate(user, payload_of(first))

        assert (await row_of(real_session, first)).expires_at > datetime.now(timezone.utc) + timedelta(days=1)


class TestGracePeriod:
    async def test_the_previous_token_still_works_right_after(self, real_session, sessions):
        # The response of the first refresh was lost, or a second tab refreshed with the same cookie
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        await sessions.rotate(user, payload_of(first))

        again = await sessions.rotate(user, payload_of(first))

        assert payload_of(again)["sid"] == payload_of(first)["sid"]
        assert (await row_of(real_session, again)).revoked_at is None

    async def test_the_holder_of_the_token_before_is_not_cut_by_that(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        second = await sessions.rotate(user, payload_of(first))
        await sessions.rotate(user, payload_of(first))

        # The second tab still holds `second`, now the previous token: good for the grace period
        await sessions.rotate(user, payload_of(second))

        assert (await row_of(real_session, second)).revoked_at is None


class TestCopiedToken:
    async def test_an_old_token_after_the_grace_period_revokes_the_session(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        current = await sessions.rotate(user, payload_of(first))
        await age_rotation(real_session, current, GRACE_PERIOD + timedelta(seconds=5))

        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, payload_of(first))

        assert (await row_of(real_session, current)).revoked_at is not None

    async def test_then_the_owner_is_logged_out_too(self, real_session, sessions):
        # Both hold a token of the same chain: nobody can tell which one is the thief
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        current = await sessions.rotate(user, payload_of(first))
        await age_rotation(real_session, current, GRACE_PERIOD + timedelta(seconds=5))
        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, payload_of(first))

        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, payload_of(current))

    async def test_a_token_two_renewals_old_is_a_copy_even_within_the_grace_period(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        second = await sessions.rotate(user, payload_of(first))
        third = await sessions.rotate(user, payload_of(second))

        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, payload_of(first))

        assert (await row_of(real_session, third)).revoked_at is not None


class TestSessionLimits:
    async def test_a_revoked_session_does_not_refresh(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        token = await sessions.open(user)
        await sessions.revoke(payload_of(token))

        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, payload_of(token))

    async def test_an_expired_session_does_not_refresh(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        token = await sessions.open(user)
        await real_session.execute(update(RefreshSession).where(RefreshSession.id == payload_of(token)["sid"])
                                   .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)))

        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, payload_of(token))

    async def test_a_session_belongs_to_its_user(self, real_session, sessions):
        owner = await make_real_test_user(real_session)
        other = await make_real_test_user(real_session)
        token = await sessions.open(owner)

        with pytest.raises(UnauthorizedError):
            await sessions.rotate(other, payload_of(token))

        assert (await row_of(real_session, token)).revoked_at is None, "a mismatch is no proof of a copy"

    async def test_an_unknown_session_is_refused(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        forged = {"sid": str(uuid4()), "jti": "0" * 32}
        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, forged)
        with pytest.raises(UnauthorizedError):
            await sessions.rotate(user, {"sid": "not-a-uuid", "jti": "x"})

    async def test_a_token_from_before_sessions_opens_one(self, real_session, sessions):
        user = await make_real_test_user(real_session)

        token = await sessions.rotate(user, {"sub": str(user.user_uuid), "type": "refresh"})

        assert (await row_of(real_session, token)).user_id == user.id

    async def test_logging_out_never_raises(self, sessions):
        await sessions.revoke({})
        await sessions.revoke({"sid": "garbage"})
        await sessions.revoke({"sid": str(uuid4())})

    async def test_only_one_of_two_renewals_with_the_same_token_wins(self, real_session):
        repository = RefreshSessionRepository(real_session)
        user = await make_real_test_user(real_session)
        now = datetime.now(timezone.utc)
        session_id = uuid4()
        await repository.create(session_id, user.id, "a" * 32, "web", now, now + timedelta(days=7))

        first = await repository.rotate(session_id, "a" * 32, "b" * 32, now, now + timedelta(days=7))
        second = await repository.rotate(session_id, "a" * 32, "c" * 32, now, now + timedelta(days=7))

        assert (first, second) == (True, False)

    async def test_expired_sessions_are_purged_at_the_next_login(self, real_session, sessions):
        user = await make_real_test_user(real_session)
        old = await sessions.open(user)
        await real_session.execute(update(RefreshSession).where(RefreshSession.id == payload_of(old)["sid"])
                                   .values(expires_at=datetime.now(timezone.utc) - timedelta(days=2)))

        await sessions.open(user)

        gone = (await real_session.execute(
            select(RefreshSession).where(RefreshSession.id == payload_of(old)["sid"]))).scalar_one_or_none()
        assert gone is None


@pytest.fixture
async def http(real_session):
    """The API on the real session, real session service included."""
    async def real_db():
        yield real_session

    app.dependency_overrides[get_db] = real_db
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client
    app.dependency_overrides.clear()


class TestOverHttp:
    async def test_the_browser_gets_the_next_refresh_cookie(self, real_session, sessions, http):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        http.cookies.set("refresh_token", first)

        response = await http.post("/api/users/refresh-token")

        assert response.status_code == 200
        second = response.cookies["refresh_token"]
        assert payload_of(second)["sid"] == payload_of(first)["sid"]
        assert payload_of(second)["jti"] != payload_of(first)["jti"]

    async def test_the_app_gets_the_next_refresh_token_in_the_body(self, real_session, sessions, http):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user, "native")

        response = await http.post("/api/users/refresh-token", headers={"Authorization": f"Bearer {first}"})

        assert response.status_code == 200 and not response.cookies
        assert payload_of(response.json()["refresh_token"])["jti"] != payload_of(first)["jti"]

    async def test_a_copied_token_replayed_later_ends_the_session(self, real_session, sessions, http):
        user = await make_real_test_user(real_session)
        first = await sessions.open(user)
        http.cookies.set("refresh_token", first)
        current = (await http.post("/api/users/refresh-token")).cookies["refresh_token"]
        await age_rotation(real_session, current, GRACE_PERIOD + timedelta(seconds=5))

        http.cookies.clear()
        http.cookies.set("refresh_token", first)
        replay = await http.post("/api/users/refresh-token")
        http.cookies.clear()
        http.cookies.set("refresh_token", current)
        owner = await http.post("/api/users/refresh-token")

        assert (replay.status_code, owner.status_code) == (401, 401)

    async def test_logout_ends_the_session_of_this_device(self, real_session, sessions, http):
        user = await make_real_test_user(real_session)
        token = await sessions.open(user)
        http.cookies.set("refresh_token", token)

        assert (await http.post("/api/users/logout")).status_code == 200
        http.cookies.set("refresh_token", token)

        assert (await http.post("/api/users/refresh-token")).status_code == 401
        assert (await row_of(real_session, token)).revoked_at is not None

    async def test_logout_without_session_still_works(self, http):
        assert (await http.post("/api/users/logout")).status_code == 200

    async def test_a_token_from_before_sessions_still_logs_in_and_gets_one(self, real_session, http):
        user = await make_real_test_user(real_session)
        http.cookies.set("refresh_token", make_legacy_refresh_token(str(user.user_uuid), user.token_version))

        response = await http.post("/api/users/refresh-token")

        assert response.status_code == 200 and "sid" in payload_of(response.cookies["refresh_token"])
