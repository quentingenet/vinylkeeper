"""
Discogs ids sent by the client are digits only: they end up in the path of a Discogs API call
made with the token of the application, and httpx resolves "..", so "1/../../oauth/identity"
would call /oauth/identity. Refused with a 422 before any service is called.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.deps.deps import get_external_reference_service, get_wishlist_service
from app.main import app
from app.schemas.external_reference_schema import AddToCollectionResponse

BAD_IDS = [
    "../1",
    "1/../../oauth/identity",
    "abc",
    "12a",
    "12 34",
    " 123",
    "1234567890123",  # 13 digits
    "",
]


def payload(external_id: str = "380980", source: str = "discogs", entity_type: str = "album") -> dict:
    return {
        "external_id": external_id,
        "entity_type": entity_type,
        "title": "AC/DC - Highway To Hell",
        "image_url": "https://i.discogs.com/x.jpg",
        "source": source,
    }


def collection_response() -> AddToCollectionResponse:
    return AddToCollectionResponse(**{
        "item": {
            "id": 1, "external_id": "380980", "entity_type": "album", "title": "Highway To Hell",
            "image_url": "https://i.discogs.com/x.jpg", "source": "discogs",
            "created_at": datetime(2026, 11, 10, tzinfo=timezone.utc),
        },
        "is_new": True, "message": "Added", "entity_type": "album", "collection_name": "Mine",
    })


@pytest.fixture
async def client_with_services(auth_client):
    client, _, _ = auth_client
    reference_service = AsyncMock()
    reference_service.add_to_collection = AsyncMock(return_value=collection_response())
    reference_service.find_owned_pressings = AsyncMock(return_value=[])
    wishlist_service = AsyncMock()
    app.dependency_overrides[get_external_reference_service] = lambda: reference_service
    app.dependency_overrides[get_wishlist_service] = lambda: wishlist_service
    with patch("app.endpoints.external_references.enrich_album_in_background", new_callable=AsyncMock):
        yield client, reference_service, wishlist_service
    app.dependency_overrides.pop(get_external_reference_service, None)
    app.dependency_overrides.pop(get_wishlist_service, None)


class TestBodyExternalId:
    @pytest.mark.parametrize("external_id", BAD_IDS)
    async def test_add_to_collection_refuses(self, client_with_services, external_id):
        client, reference_service, _ = client_with_services

        resp = await client.post("/api/external-references/collection/1/add", json=payload(external_id))

        assert resp.status_code == 422
        reference_service.add_to_collection.assert_not_called()

    @pytest.mark.parametrize("external_id", BAD_IDS)
    async def test_add_to_wishlist_refuses(self, client_with_services, external_id):
        client, _, wishlist_service = client_with_services

        resp = await client.post("/api/external-references/wishlist/add", json=payload(external_id))

        assert resp.status_code == 422
        wishlist_service.add_to_wishlist.assert_not_called()

    async def test_replace_pressing_refuses(self, client_with_services):
        client, reference_service, _ = client_with_services

        resp = await client.post(
            "/api/external-references/collection/1/albums/2/replace", json=payload("1/../../oauth/identity"))

        assert resp.status_code == 422
        reference_service.replace_pressing.assert_not_called()

    async def test_twelve_digits_reach_the_service(self, client_with_services):
        client, reference_service, _ = client_with_services

        await client.post("/api/external-references/collection/1/add", json=payload("123456789012"))

        reference_service.add_to_collection.assert_awaited_once()
        assert reference_service.add_to_collection.await_args.args[2].external_id == "123456789012"


class TestSource:
    @pytest.mark.parametrize("source", ["musicbrainz", "spotify", ""])
    async def test_other_source_refused(self, client_with_services, source):
        client, reference_service, _ = client_with_services

        resp = await client.post("/api/external-references/collection/1/add", json=payload(source=source))

        assert resp.status_code == 422
        reference_service.add_to_collection.assert_not_called()

    async def test_source_normalized_to_lowercase(self, client_with_services):
        client, reference_service, _ = client_with_services

        await client.post("/api/external-references/collection/1/add", json=payload(source=" Discogs "))

        assert reference_service.add_to_collection.await_args.args[2].source == "discogs"


class TestQueryExternalId:
    @pytest.mark.parametrize("external_id", BAD_IDS)
    async def test_owned_pressings_refuses_external_id(self, client_with_services, external_id):
        client, reference_service, _ = client_with_services

        resp = await client.get(
            "/api/external-references/collection/owned", params={"external_id": external_id})

        assert resp.status_code == 422
        reference_service.find_owned_pressings.assert_not_called()

    @pytest.mark.parametrize("master_id", BAD_IDS)
    async def test_owned_pressings_refuses_master_id(self, client_with_services, master_id):
        client, reference_service, _ = client_with_services

        resp = await client.get(
            "/api/external-references/collection/owned", params={"external_id": "380980", "master_id": master_id})

        assert resp.status_code == 422
        reference_service.find_owned_pressings.assert_not_called()

    async def test_owned_pressings_accepts_ids(self, client_with_services):
        client, reference_service, _ = client_with_services

        resp = await client.get(
            "/api/external-references/collection/owned", params={"external_id": "380980", "master_id": "8522"})

        assert resp.status_code == 200
        reference_service.find_owned_pressings.assert_awaited_once()

    async def test_owned_pressings_without_master(self, client_with_services):
        client, reference_service, _ = client_with_services

        resp = await client.get("/api/external-references/collection/owned", params={"external_id": "380980"})

        assert resp.status_code == 200


