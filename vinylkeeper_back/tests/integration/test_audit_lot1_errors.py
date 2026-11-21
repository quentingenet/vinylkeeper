"""
Mistakes of the client get a 4xx, never a 500, and an unknown member is no expired session
(no database, no network: the services are replaced).
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.logging import log_config
from app.deps.deps import get_collection_service, get_search_service, get_user_service, get_wishlist_service
from app.main import app
from app.repositories.user_repository import UserRepository
from app.services.search_service import SearchService
from app.services.user_service import UserService
from app.utils.auth_utils.auth import create_access_token

from tests.integration.test_auth_endpoints import patch_user_lookup

STRANGER_UUID = "11111111-2222-3333-4444-555555555555"


class TestWishlistOfAnotherMember:
    @pytest.fixture
    def services(self, auth_client):
        """The real UserService over a repository that knows nobody, the rest replaced."""
        client, _, _ = auth_client
        repository = MagicMock(spec=UserRepository)
        repository.get_user_by_uuid = AsyncMock(return_value=None)
        wishlist = AsyncMock()
        app.dependency_overrides[get_user_service] = lambda: UserService(repository, AsyncMock())
        app.dependency_overrides[get_wishlist_service] = lambda: wishlist
        app.dependency_overrides[get_collection_service] = lambda: AsyncMock()
        return client, repository, wishlist

    async def test_an_unknown_member_is_a_404_not_an_expired_session(self, services):
        client, repository, wishlist = services
        response = await client.get("/api/external-references/wishlist", params={"user_uuid": STRANGER_UUID})

        assert response.status_code == 404
        repository.get_user_by_uuid.assert_awaited_once_with(STRANGER_UUID)
        wishlist.get_user_wishlist_paginated.assert_not_called()

    async def test_a_malformed_uuid_is_refused_before_the_database(self, services):
        client, repository, _ = services
        response = await client.get("/api/external-references/wishlist", params={"user_uuid": "not-a-uuid"})

        assert response.status_code == 422
        repository.get_user_by_uuid.assert_not_called()


class TestCsrfHeader:
    async def test_a_header_that_is_not_ascii_is_a_403_not_a_500(self, client, mock_user):
        client.cookies.set("access_token", create_access_token(str(mock_user.user_uuid)))
        client.cookies.set("csrf_token", "abc")
        app.dependency_overrides[get_user_service] = lambda: AsyncMock()

        with patch_user_lookup(mock_user):
            response = await client.put(
                "/api/users/me/currency", json={"currency": "USD"},
                headers={"X-CSRF-Token": "é".encode("latin-1")})

        assert response.status_code == 403

    async def test_the_right_token_still_passes(self, client, mock_user):
        client.cookies.set("access_token", create_access_token(str(mock_user.user_uuid)))
        client.cookies.set("csrf_token", "abc")
        app.dependency_overrides[get_user_service] = lambda: AsyncMock()

        with patch_user_lookup(mock_user):
            response = await client.put(
                "/api/users/me/currency", json={"currency": "USD"}, headers={"X-CSRF-Token": "abc"})

        assert response.status_code == 200


class TestDiscogsIds:
    @pytest.mark.parametrize("path", [
        "/api/request-proxy/music-metadata/artist/abc",
        "/api/request-proxy/music-metadata/album/12a",
    ])
    async def test_an_id_that_is_not_digits_is_a_400_and_discogs_is_not_called(self, auth_client, path):
        client, _, _ = auth_client
        http_client = AsyncMock()
        app.dependency_overrides[get_search_service] = lambda: SearchService(http_client)

        response = await client.get(path)

        assert response.status_code == 400
        http_client.get.assert_not_called()


def test_the_errors_of_the_app_reach_the_error_log():
    assert "error_file" in log_config["loggers"]["app"]["handlers"]
