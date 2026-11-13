"""
The Discogs OAuth callback is completed only for the Vinyl Keeper user of the browser that comes
back: the one who started the connection.

Without this, an attacker starts a connection and sends the Discogs authorization page to a
victim: if the victim authorizes, the victim's Discogs account is linked to the attacker's
Vinyl Keeper account. The browser is identified by its refresh token: the access token (15 min)
has often expired after a stay on Discogs as long as the request lifetime (15 min).

Discogs is simulated, the database is the real test copy, everything is rolled back.
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.session import get_db
from app.endpoints.discogs_import import get_oauth_service
from app.main import app
from app.models.discogs_connection_model import DiscogsConnection, DiscogsOAuthRequest
from app.utils.auth_utils.auth import ALGORITHM, PRIVATE_KEY, TokenType, create_access_token
from tests.conftest import make_legacy_refresh_token

from tests.integration.conftest import make_real_test_user
from tests.integration.test_discogs_oauth_real_db import FakeDiscogs, configured, service  # noqa: F401

CALLBACK = "/api/discogs-import/oauth/callback"
QUERY = {"oauth_token": "req-tok", "oauth_verifier": "the-verifier"}


@pytest.fixture
async def setup(real_session):
    """The API on the real session, with a simulated Discogs; yields (client, fake Discogs)."""
    fake = FakeDiscogs()

    async def real_db():
        yield real_session

    app.dependency_overrides[get_db] = real_db
    app.dependency_overrides[get_oauth_service] = lambda: service(real_session, fake)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, fake
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_oauth_service, None)


def refresh_token_of(user) -> str:
    return make_legacy_refresh_token(str(user.user_uuid), user.token_version)


def expired_access_token_of(user) -> str:
    payload = {"sub": str(user.user_uuid), "type": TokenType.ACCESS.value, "ver": user.token_version,
               "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}
    return jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM)


def outcome(response) -> str:
    assert response.status_code == 303
    return parse_qs(urlparse(response.headers["location"]).query)["discogs"][0]


async def connections_of(session, user) -> int:
    return (await session.execute(
        select(func.count()).select_from(DiscogsConnection).where(DiscogsConnection.user_id == user.id)
    )).scalar_one()


async def pending_requests(session) -> int:
    return (await session.execute(
        select(func.count()).select_from(DiscogsOAuthRequest).where(DiscogsOAuthRequest.request_token == "req-tok")
    )).scalar_one()


def exchanged_tokens(fake) -> bool:
    return any(request.url.path == "/oauth/access_token" for request in fake.seen)


async def test_the_user_who_started_is_connected(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)

    client.cookies.set("refresh_token", refresh_token_of(user))
    response = await client.get(CALLBACK, params=QUERY)

    assert outcome(response) == "connected"
    assert await connections_of(real_session, user) == 1


async def test_an_expired_access_token_with_a_valid_refresh_token_is_enough(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)

    client.cookies.set("access_token", expired_access_token_of(user))
    client.cookies.set("refresh_token", refresh_token_of(user))
    response = await client.get(CALLBACK, params=QUERY)

    assert outcome(response) == "connected"
    assert await connections_of(real_session, user) == 1


async def test_no_session_is_refused_and_nothing_is_kept(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)

    response = await client.get(CALLBACK, params=QUERY)

    assert outcome(response) == "session"
    assert await connections_of(real_session, user) == 0
    assert await pending_requests(real_session) == 0, "the request is consumed"
    assert not exchanged_tokens(fake), "no Discogs token is asked for"


async def test_an_invalid_refresh_token_is_refused(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)

    client.cookies.set("refresh_token", "not-a-token")
    response = await client.get(CALLBACK, params=QUERY)

    assert outcome(response) == "session"
    assert await connections_of(real_session, user) == 0
    assert not exchanged_tokens(fake)


async def test_the_session_of_another_user_is_refused(real_session, setup):
    # The attack: the victim's browser comes back with the request started by the attacker
    client, fake = setup
    attacker = await make_real_test_user(real_session)
    victim = await make_real_test_user(real_session)
    await service(real_session, fake).start(attacker)

    client.cookies.set("refresh_token", refresh_token_of(victim))
    response = await client.get(CALLBACK, params=QUERY)

    assert outcome(response) == "session"
    assert await connections_of(real_session, attacker) == 0
    assert await connections_of(real_session, victim) == 0
    assert await pending_requests(real_session) == 0, "the request is consumed"
    assert not exchanged_tokens(fake), "no Discogs token is asked for"


async def test_a_replayed_callback_is_refused(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)
    client.cookies.set("refresh_token", refresh_token_of(user))

    assert outcome(await client.get(CALLBACK, params=QUERY)) == "connected"
    assert outcome(await client.get(CALLBACK, params=QUERY)) == "expired"
    assert await connections_of(real_session, user) == 1


# ---------------------------------------------------------------------------
# The native app finishes the connection with its own Bearer session
# ---------------------------------------------------------------------------

COMPLETE = "/api/discogs-import/oauth/complete"
BODY = {"oauth_token": "req-tok", "oauth_verifier": "the-verifier"}


def bearer_of(user) -> dict:
    return {"Authorization": f"Bearer {create_access_token(str(user.user_uuid), user.token_version)}"}


async def test_the_app_completes_with_its_own_session(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user, native=False)

    response = await client.post(COMPLETE, json=BODY, headers=bearer_of(user))

    assert response.status_code == 200
    assert (response.json()["connected"], response.json()["discogs_username"]) == (True, "digger")
    assert await connections_of(real_session, user) == 1


async def test_another_user_cannot_complete_the_authorization_of_the_first(real_session, setup):
    client, fake = setup
    starter = await make_real_test_user(real_session)
    victim = await make_real_test_user(real_session)
    await service(real_session, fake).start(starter)

    response = await client.post(COMPLETE, json=BODY, headers=bearer_of(victim))

    assert response.status_code == 400 and response.json()["details"]["reason"] == "session"
    assert await connections_of(real_session, victim) == 0 and await connections_of(real_session, starter) == 0
    assert await pending_requests(real_session) == 0, "the request is consumed"
    assert not exchanged_tokens(fake), "no Discogs token is asked for"


async def test_completing_needs_a_session(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)

    assert (await client.post(COMPLETE, json=BODY)).status_code == 401
    assert await pending_requests(real_session) == 1, "an anonymous call does not consume the request"


async def test_a_token_completes_once_only(real_session, setup):
    client, fake = setup
    user = await make_real_test_user(real_session)
    await service(real_session, fake).start(user)

    assert (await client.post(COMPLETE, json=BODY, headers=bearer_of(user))).status_code == 200
    again = await client.post(COMPLETE, json=BODY, headers=bearer_of(user))

    assert again.status_code == 400 and again.json()["details"]["reason"] == "expired"
