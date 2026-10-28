"""
Adding an album schedules its Discogs enrichment after the response, and only
after a successful addition. The enrichment itself is mocked: no network.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import ForbiddenError
from app.deps.deps import get_external_reference_service, get_wishlist_service
from app.main import app

NOW = datetime(2026, 10, 28, tzinfo=timezone.utc)


def add_payload(entity_type: str = "album", source: str = "discogs") -> dict:
    return {
        "external_id": "380980",
        "entity_type": entity_type,
        "title": "AC/DC - Highway To Hell",
        "image_url": "https://i.discogs.com/x.jpg",
        "source": source,
    }


def collection_response(entity_type: str = "album") -> dict:
    return {
        "item": {
            "id": 1, "external_id": "380980", "entity_type": entity_type, "title": "Highway To Hell",
            "image_url": "https://i.discogs.com/x.jpg", "source": "discogs", "created_at": NOW,
        },
        "is_new": True, "message": "Added", "entity_type": entity_type, "collection_name": "Mine",
    }


def wishlist_response() -> dict:
    return {
        "item": {
            "id": 1, "external_id": "380980", "title": "Highway To Hell",
            "image_url": "https://i.discogs.com/x.jpg", "created_at": NOW,
        },
        "is_new": True, "message": "Added", "entity_type": "album",
    }


@pytest.fixture
async def client_with_services(auth_client):
    client, _, _ = auth_client
    reference_service = AsyncMock()
    wishlist_service = AsyncMock()
    app.dependency_overrides[get_external_reference_service] = lambda: reference_service
    app.dependency_overrides[get_wishlist_service] = lambda: wishlist_service
    with patch("app.endpoints.external_references.enrich_album_in_background", new_callable=AsyncMock) as enrich:
        yield client, reference_service, wishlist_service, enrich
    app.dependency_overrides.pop(get_external_reference_service, None)
    app.dependency_overrides.pop(get_wishlist_service, None)


class TestEnrichmentScheduling:
    async def test_album_added_to_collection_is_enriched(self, client_with_services):
        client, reference_service, _, enrich = client_with_services
        reference_service.add_to_collection = AsyncMock(return_value=collection_response())

        resp = await client.post("/api/external-references/collection/1/add", json=add_payload())

        assert resp.status_code == 200
        enrich.assert_awaited_once_with("380980")

    async def test_album_added_to_wishlist_is_enriched(self, client_with_services):
        client, _, wishlist_service, enrich = client_with_services
        wishlist_service.add_to_wishlist = AsyncMock(return_value=wishlist_response())

        resp = await client.post("/api/external-references/wishlist/add", json=add_payload())

        assert resp.status_code == 200
        enrich.assert_awaited_once_with("380980")

    async def test_source_case_is_ignored(self, client_with_services):
        client, reference_service, _, enrich = client_with_services
        reference_service.add_to_collection = AsyncMock(return_value=collection_response())

        await client.post("/api/external-references/collection/1/add", json=add_payload(source="DISCOGS"))

        enrich.assert_awaited_once()

    async def test_artist_is_not_enriched(self, client_with_services):
        client, reference_service, _, enrich = client_with_services
        reference_service.add_to_collection = AsyncMock(return_value=collection_response("artist"))

        resp = await client.post("/api/external-references/collection/1/add", json=add_payload("artist"))

        assert resp.status_code == 200
        enrich.assert_not_called()

    async def test_other_source_is_not_enriched(self, client_with_services):
        client, reference_service, _, enrich = client_with_services
        reference_service.add_to_collection = AsyncMock(return_value=collection_response())

        await client.post("/api/external-references/collection/1/add", json=add_payload(source="musicbrainz"))

        enrich.assert_not_called()

    async def test_failed_addition_schedules_nothing(self, client_with_services):
        client, reference_service, _, enrich = client_with_services
        reference_service.add_to_collection = AsyncMock(
            side_effect=ForbiddenError(error_code=4030, message="Not your collection"))

        resp = await client.post("/api/external-references/collection/1/add", json=add_payload())

        assert resp.status_code == 403
        enrich.assert_not_called()
