"""
"Connect with Discogs" against the real database, Discogs itself simulated with httpx.MockTransport.
Same safety model as test_real_db_relationships.py: everything is rolled back.
"""
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet
from sqlalchemy import select, text

from app.core.exceptions import ServerError
from app.models.discogs_connection_model import DiscogsConnection, DiscogsOAuthRequest
from app.repositories.discogs_connection_repository import DiscogsConnectionRepository
from app.services import discogs_oauth_service as oauth_module
from app.services.discogs_oauth_service import (
    DiscogsOAuthError,
    DiscogsOAuthService,
    decrypt,
    oauth_header,
)

from tests.integration.conftest import make_real_test_user as make_test_user


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    for name, value in {
        "DISCOGS_CONSUMER_KEY": "ckey", "DISCOGS_CONSUMER_SECRET": "csecret&x",
        "DISCOGS_TOKEN_KEY": Fernet.generate_key().decode(),
        "DISCOGS_OAUTH_CALLBACK_URL": "https://api.example.com/api/discogs-import/oauth/callback",
    }.items():
        monkeypatch.setattr(oauth_module.settings, name, value)


class FakeDiscogs:
    """The three OAuth endpoints of Discogs, recording what they receive."""

    def __init__(self, identity=None, access_status=200):
        self.seen: list[httpx.Request] = []
        self.identity = identity or {"id": 4242, "username": "digger"}
        self.access_status = access_status

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.seen.append(request)
        if request.url.path == "/oauth/request_token":
            return httpx.Response(
                200, text="oauth_token=req-tok&oauth_token_secret=req-sec&oauth_callback_confirmed=true")
        if request.url.path == "/oauth/access_token":
            if self.access_status != 200:
                return httpx.Response(self.access_status)
            return httpx.Response(200, text="oauth_token=acc-tok&oauth_token_secret=acc-sec")
        if request.url.path == "/oauth/identity":
            return httpx.Response(200, json=self.identity)
        return httpx.Response(404)


def service(session, fake) -> DiscogsOAuthService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(fake))
    return DiscogsOAuthService(DiscogsConnectionRepository(session), client)


def header_params(request: httpx.Request) -> dict[str, str]:
    raw = request.headers["Authorization"].removeprefix("OAuth ")
    return {k: v.strip('"') for k, v in (part.split("=", 1) for part in raw.split(", "))}


def test_plaintext_signature_is_both_secrets_encoded():
    params = dict(part.split("=", 1) for part in oauth_header("tok", "s/ec").removeprefix("OAuth ").split(", "))

    assert params["oauth_signature_method"] == '"PLAINTEXT"'
    assert params["oauth_signature"] == '"csecret%2526x%26s%252Fec"'  # quote(quote(secret)&quote(token_secret))
    assert params["oauth_token"] == '"tok"' and params["oauth_consumer_key"] == '"ckey"'


class TestConnect:
    async def test_full_round_trip_keeps_the_identity_and_encrypted_tokens(self, real_session):
        user = await make_test_user(real_session)
        fake = FakeDiscogs()
        oauth = service(real_session, fake)

        authorize_url = await oauth.start(user)
        username = await oauth.complete("req-tok", "the-verifier")

        assert parse_qs(urlparse(authorize_url).query) == {"oauth_token": ["req-tok"]}
        assert authorize_url.startswith("https://www.discogs.com/oauth/authorize")
        assert username == "digger"
        callback = header_params(fake.seen[0])
        assert callback["oauth_callback"] == "https%3A%2F%2Fapi.example.com%2Fapi%2Fdiscogs-import%2Foauth%2Fcallback"
        access = header_params(fake.seen[1])
        assert (access["oauth_token"], access["oauth_verifier"]) == ("req-tok", "the-verifier")
        connection = (await real_session.execute(
            select(DiscogsConnection).where(DiscogsConnection.user_id == user.id))).scalar_one()
        assert (connection.discogs_username, connection.discogs_user_id) == ("digger", 4242)
        assert connection.access_token != "acc-tok" and decrypt(connection.access_token) == "acc-tok"
        assert decrypt(connection.access_secret) == "acc-sec"

    async def test_a_request_token_works_once(self, real_session):
        user = await make_test_user(real_session)
        oauth = service(real_session, FakeDiscogs())
        await oauth.start(user)
        await oauth.complete("req-tok", "v")

        with pytest.raises(DiscogsOAuthError) as error:
            await oauth.complete("req-tok", "v")
        assert error.value.reason == "expired"

    async def test_an_old_request_has_expired(self, real_session):
        user = await make_test_user(real_session)
        oauth = service(real_session, FakeDiscogs())
        await oauth.start(user)
        await real_session.execute(text(
            "UPDATE discogs_oauth_requests SET created_at = now() - interval '1 hour' WHERE request_token = 'req-tok'"))

        with pytest.raises(DiscogsOAuthError):
            await oauth.complete("req-tok", "v")
        assert (await real_session.execute(select(DiscogsOAuthRequest).where(
            DiscogsOAuthRequest.request_token == "req-tok"))).scalar_one_or_none() is None

    async def test_discogs_refusing_the_exchange_keeps_nothing(self, real_session):
        user = await make_test_user(real_session)
        oauth = service(real_session, FakeDiscogs(access_status=401))
        await oauth.start(user)

        with pytest.raises(DiscogsOAuthError) as error:
            await oauth.complete("req-tok", "bad")
        assert error.value.reason == "refused"
        assert await oauth.repository.get_connection(user.id) is None

    async def test_connecting_another_account_replaces_the_first(self, real_session):
        user = await make_test_user(real_session)
        await service(real_session, FakeDiscogs()).start(user)
        await service(real_session, FakeDiscogs()).complete("req-tok", "v")
        second = service(real_session, FakeDiscogs(identity={"id": 7, "username": "other"}))
        await second.start(user)
        await second.complete("req-tok", "v")

        connection = await second.repository.get_connection(user.id)
        assert (connection.discogs_username, connection.discogs_user_id) == ("other", 7)

    async def test_not_configured_refuses_to_start(self, real_session, monkeypatch):
        monkeypatch.setattr(oauth_module.settings, "DISCOGS_CONSUMER_SECRET", "")
        user = await make_test_user(real_session)

        with pytest.raises(ServerError):
            await service(real_session, FakeDiscogs()).start(user)


class TestDisconnect:
    async def test_disconnecting_deletes_the_tokens(self, real_session):
        user = await make_test_user(real_session)
        oauth = service(real_session, FakeDiscogs())
        await oauth.start(user)
        await oauth.complete("req-tok", "v")

        await oauth.disconnect(user)

        assert await oauth.repository.get_connection(user.id) is None
        assert await oauth.authorization_for(user.id) is None

    async def test_the_import_signs_as_the_connected_account(self, real_session):
        user = await make_test_user(real_session)
        oauth = service(real_session, FakeDiscogs())
        await oauth.start(user)
        await oauth.complete("req-tok", "v")

        username, authorization = await oauth.authorization_for(user.id)
        params = dict(part.split("=", 1) for part in authorization().removeprefix("OAuth ").split(", "))

        assert username == "digger"
        assert params["oauth_token"] == '"acc-tok"'
        assert params["oauth_signature"].endswith('%26acc-sec"')

    async def test_a_lost_encryption_key_asks_to_connect_again(self, real_session, monkeypatch):
        user = await make_test_user(real_session)
        oauth = service(real_session, FakeDiscogs())
        await oauth.start(user)
        await oauth.complete("req-tok", "v")
        monkeypatch.setattr(oauth_module.settings, "DISCOGS_TOKEN_KEY", Fernet.generate_key().decode())

        assert await oauth.authorization_for(user.id) is None


async def test_expired_requests_are_cleaned_when_a_new_one_starts(real_session):
    user = await make_test_user(real_session)
    repository = DiscogsConnectionRepository(real_session)
    await repository.add_request("old", "x", user.id)
    await real_session.execute(text("UPDATE discogs_oauth_requests SET created_at = now() - interval '1 day'"
                                    " WHERE request_token = 'old'"))

    await repository.delete_expired_requests(timedelta(minutes=15))

    assert (await real_session.execute(select(DiscogsOAuthRequest).where(
        DiscogsOAuthRequest.request_token == "old"))).scalar_one_or_none() is None
