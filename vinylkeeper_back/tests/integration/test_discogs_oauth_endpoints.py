"""HTTP layer of "Connect with Discogs" and of the import that now relies on it."""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import ValidationError
from app.endpoints import discogs_import as endpoints
from app.main import app
from app.services.discogs_oauth_service import DiscogsOAuthError


@pytest.fixture
def oauth():
    service = MagicMock()
    service.repository = MagicMock(get_connection=AsyncMock(return_value=None), take_request=AsyncMock(),
                                   db=MagicMock(commit=AsyncMock()))
    service.start = AsyncMock(return_value="https://www.discogs.com/oauth/authorize?oauth_token=t")
    service.complete = AsyncMock(return_value="digger")
    service.disconnect = AsyncMock()
    service.authorization_for = AsyncMock(return_value=None)
    app.dependency_overrides[endpoints.get_oauth_service] = lambda: service
    yield service
    app.dependency_overrides.pop(endpoints.get_oauth_service, None)


def connection():
    return SimpleNamespace(discogs_username="digger", connected_at=datetime(2026, 10, 30, tzinfo=timezone.utc))


class TestConnection:
    async def test_status_without_connection(self, auth_client, oauth):
        client, *_ = auth_client
        response = await client.get("/api/discogs-import/connection")

        assert response.status_code == 200
        assert response.json()["connected"] is False and response.json()["discogs_username"] is None

    async def test_status_shows_the_account_and_never_a_token(self, auth_client, oauth):
        oauth.repository.get_connection.return_value = connection()
        client, *_ = auth_client

        body = (await client.get("/api/discogs-import/connection")).json()

        assert (body["connected"], body["discogs_username"]) == (True, "digger")
        assert not {"access_token", "access_secret", "token"} & set(body)

    async def test_connect_returns_the_discogs_page(self, auth_client, oauth):
        client, *_ = auth_client
        response = await client.post("/api/discogs-import/connect")

        assert response.json() == {"authorize_url": "https://www.discogs.com/oauth/authorize?oauth_token=t"}

    async def test_disconnect(self, auth_client, oauth):
        client, *_ = auth_client
        assert (await client.delete("/api/discogs-import/connection")).status_code == 204
        oauth.disconnect.assert_awaited_once()

    async def test_visitors_cannot_connect(self, client, oauth):
        assert (await client.post("/api/discogs-import/connect")).status_code == 401


class TestCallback:
    @pytest.mark.parametrize("query, outcome", [
        ("oauth_token=t&oauth_verifier=v", "connected"),
        ("denied=t", "denied"),
        ("", "error"),
    ])
    async def test_always_back_to_the_app_with_the_outcome(self, client, oauth, query, outcome, monkeypatch):
        monkeypatch.setattr(endpoints.settings, "FRONTEND_URL", "https://vinylkeeper.org/")

        response = await client.get(f"/api/discogs-import/oauth/callback?{query}", follow_redirects=False)

        assert response.status_code == 303
        assert response.headers["location"] == f"https://vinylkeeper.org/collections?discogs={outcome}"

    async def test_an_expired_request_says_so(self, client, oauth):
        oauth.complete.side_effect = DiscogsOAuthError("expired")

        response = await client.get("/api/discogs-import/oauth/callback?oauth_token=t&oauth_verifier=v",
                                    follow_redirects=False)

        assert response.headers["location"].endswith("?discogs=expired")


class TestImportNeedsTheConnectedAccount:
    async def test_preview_without_connection_is_refused(self, auth_client, oauth):
        client, *_ = auth_client
        response = await client.get("/api/discogs-import/preview")

        assert response.status_code == 400
        assert response.json()["details"]["reason"] == "not_connected"

    async def test_import_without_connection_is_refused(self, auth_client, oauth):
        client, *_ = auth_client
        assert (await client.post("/api/discogs-import/", json={"collection_id": None})).status_code == 400

    async def test_a_typed_username_is_no_longer_accepted(self, auth_client, oauth):
        oauth.repository.get_connection.return_value = connection()
        client, *_ = auth_client

        response = await client.post("/api/discogs-import/", json={"discogs_username": "someone_else"})

        assert response.status_code == 422

    async def test_the_import_uses_the_connected_identity(self, auth_client, oauth, monkeypatch):
        oauth.repository.get_connection.return_value = connection()
        created = AsyncMock(side_effect=ValidationError(error_code=2002, message="stop here"))
        monkeypatch.setattr(endpoints.DiscogsImportService, "create_import", created)
        monkeypatch.setattr(endpoints, "run_discogs_imports", AsyncMock())
        client, *_ = auth_client

        await client.post("/api/discogs-import/", json={"collection_id": 5})

        # (user_id, collection_id, discogs_username): the mock replaces the method, without self
        assert created.await_args.args[2] == "digger"
