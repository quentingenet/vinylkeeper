from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.deps.deps import get_place_service
from app.utils.auth_utils.auth import get_current_user, create_token, TokenType
from app.core.exceptions import (
    ForbiddenError,
    ResourceNotFoundError,
    ValidationError,
)
from app.schemas.place_schema import PublicPlaceResponse, PlaceTypeResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_public_place_response(place_id: int = 1, owner_id: int = 1) -> PublicPlaceResponse:
    """Return a valid PublicPlaceResponse for use in service mocks."""
    _now = datetime.now(timezone.utc)
    return PublicPlaceResponse(
        id=place_id,
        name="Vinyl Shop",
        address="1 rue de la Paix",
        city="Paris",
        country="France",
        latitude=48.8566,
        longitude=2.3522,
        description=None,
        source_url=None,
        place_type=PlaceTypeResponse(id=1, name="record_store"),
        submitted_by_id=owner_id,
        is_moderated=True,
        is_valid=True,
        likes_count=0,
        is_liked=False,
        created_at=_now,
        updated_at=_now,
    )


def _make_place(place_id: int = 1, owner_id: int = 1) -> MagicMock:
    place = MagicMock()
    place.id = place_id
    place.name = "Vinyl Shop"
    place.address = "1 rue de la Paix"
    place.city = "Paris"
    place.country = "France"
    place.latitude = 48.8566
    place.longitude = 2.3522
    place.description = None
    place.source_url = None
    place.place_type_id = 1
    place.submitted_by_id = owner_id
    place.is_moderated = True
    place.is_valid = True
    place.likes_count = 0
    place.is_liked = False
    place.created_at = datetime.now(timezone.utc)
    place.updated_at = datetime.now(timezone.utc)
    _now = datetime.now(timezone.utc)
    place.model_dump = MagicMock(return_value={
        "id": place_id,
        "name": "Vinyl Shop",
        "address": "1 rue de la Paix",
        "city": "Paris",
        "country": "France",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "description": None,
        "source_url": None,
        "place_type_id": 1,
        "submitted_by_id": owner_id,
        "is_moderated": True,
        "is_valid": True,
        "likes_count": 0,
        "is_liked": False,
        "created_at": _now.isoformat(),
        "updated_at": _now.isoformat(),
    })
    return place


_VALID_PAYLOAD = {
    "name": "Vinyl Shop",
    "address": "1 rue de la Paix",
    "city": "Paris",
    "country": "France",
    "place_type_id": 1,
    "latitude": 48.8566,
    "longitude": 2.3522,
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_place_service():
    return AsyncMock()


@pytest.fixture
async def place_client(mock_user, mock_place_service):
    """Authenticated client with place_service dependency overridden."""
    async def override_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_place_service] = lambda: mock_place_service

    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            c.cookies.set("access_token", create_token(str(mock_user.user_uuid), TokenType.ACCESS))
            yield c, mock_place_service, mock_user

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /api/places/
# ---------------------------------------------------------------------------

class TestCreatePlace:
    async def test_success_returns_201(self, place_client):
        client, service, user = place_client
        service.create_place = AsyncMock(return_value=_make_public_place_response(owner_id=user.id))

        resp = await client.post("/api/places/", json=_VALID_PAYLOAD)

        assert resp.status_code == 201
        body = resp.json()
        assert body["message"] == "Place created successfully"
        assert "place" in body
        assert body["place"]["name"] == "Vinyl Shop"

    async def test_invalid_place_type_returns_400(self, place_client):
        client, service, _ = place_client
        service.create_place = AsyncMock(
            side_effect=ValidationError(error_code=4000, message="Place type with ID 99 not found")
        )

        resp = await client.post("/api/places/", json={**_VALID_PAYLOAD, "place_type_id": 99})

        assert resp.status_code == 400
        body = resp.json()
        assert "code" in body
        assert "message" in body

    async def test_missing_required_field_returns_422(self, place_client):
        client, *_ = place_client
        resp = await client.post("/api/places/", json={"name": "Vinyl Shop"})
        assert resp.status_code == 422

    async def test_no_auth_returns_401(self, client):
        resp = await client.post("/api/places/", json=_VALID_PAYLOAD)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/places/
# ---------------------------------------------------------------------------

class TestGetPlaces:
    async def test_success_returns_200_paginated(self, place_client):
        client, service, _ = place_client
        service.get_all_places = AsyncMock(return_value=MagicMock(
            items=[], total=0, page=1, limit=20, total_pages=1
        ))

        resp = await client.get("/api/places/")

        assert resp.status_code == 200

    async def test_no_auth_returns_401(self, client):
        resp = await client.get("/api/places/")
        assert resp.status_code == 401

    async def test_pagination_params_forwarded(self, place_client):
        client, service, _ = place_client
        service.get_all_places = AsyncMock(return_value=MagicMock(
            items=[], total=0, page=2, limit=5, total_pages=1
        ))

        await client.get("/api/places/?page=2&limit=5")

        service.get_all_places.assert_awaited_once()
        _, call_page, call_limit = service.get_all_places.call_args[0]
        assert call_page == 2
        assert call_limit == 5


# ---------------------------------------------------------------------------
# GET /api/places/map
# ---------------------------------------------------------------------------

class TestGetMapPlaces:
    async def test_success_returns_200_list(self, place_client):
        client, service, _ = place_client
        service.get_map_places = AsyncMock(return_value=[])

        resp = await client.get("/api/places/map")

        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_no_auth_returns_401(self, client):
        resp = await client.get("/api/places/map")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/places/place-types  (public — no auth required)
# ---------------------------------------------------------------------------

class TestGetPlaceTypes:
    async def test_success_no_auth_required(self, client, mock_place_service):
        app.dependency_overrides[get_place_service] = lambda: mock_place_service
        pt = MagicMock()
        pt.id = 1
        pt.name = "record_store"
        mock_place_service.get_place_types = AsyncMock(return_value=[pt])

        with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                resp = await c.get("/api/places/place-types")

        app.dependency_overrides.clear()

        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 1
        assert body[0]["id"] == 1
        assert body[0]["name"] == "record_store"


# ---------------------------------------------------------------------------
# GET /api/places/{place_id}
# ---------------------------------------------------------------------------

class TestGetPlaceById:
    async def test_success_returns_200(self, place_client):
        client, service, _ = place_client
        service.get_place = AsyncMock(return_value=_make_public_place_response())

        resp = await client.get("/api/places/1")

        assert resp.status_code == 200

    async def test_not_found_returns_404(self, place_client):
        client, service, _ = place_client
        service.get_place = AsyncMock(side_effect=ResourceNotFoundError("Place", 99))

        resp = await client.get("/api/places/99")

        assert resp.status_code == 404
        assert resp.json()["code"] == 2000

    async def test_no_auth_returns_401(self, client):
        resp = await client.get("/api/places/1")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/places/{place_id}
# ---------------------------------------------------------------------------

class TestUpdatePlace:
    async def test_success_returns_200(self, place_client):
        client, service, _ = place_client
        service.update_place = AsyncMock(return_value=_make_public_place_response())

        resp = await client.patch("/api/places/1", json={"name": "New Name"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "Place updated successfully"
        assert "place" in body

    async def test_not_owner_returns_403(self, place_client):
        client, service, _ = place_client
        service.update_place = AsyncMock(side_effect=ForbiddenError())

        resp = await client.patch("/api/places/2", json={"name": "New Name"})

        assert resp.status_code == 403
        assert resp.json()["code"] == 4030

    async def test_not_found_returns_404(self, place_client):
        client, service, _ = place_client
        service.update_place = AsyncMock(side_effect=ResourceNotFoundError("Place", 99))

        resp = await client.patch("/api/places/99", json={"name": "New Name"})

        assert resp.status_code == 404

    async def test_no_auth_returns_401(self, client):
        resp = await client.patch("/api/places/1", json={"name": "New Name"})
        assert resp.status_code == 401

    async def test_empty_body_returns_422(self, place_client):
        client, *_ = place_client
        resp = await client.patch("/api/places/1", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /api/places/{place_id}
# ---------------------------------------------------------------------------

class TestDeletePlace:
    async def test_success_returns_204(self, place_client):
        client, service, _ = place_client
        service.delete_place = AsyncMock(return_value=None)

        resp = await client.delete("/api/places/1")

        assert resp.status_code == 204

    async def test_not_owner_returns_403(self, place_client):
        client, service, _ = place_client
        service.delete_place = AsyncMock(side_effect=ForbiddenError())

        resp = await client.delete("/api/places/2")

        assert resp.status_code == 403

    async def test_not_found_returns_404(self, place_client):
        client, service, _ = place_client
        service.delete_place = AsyncMock(side_effect=ResourceNotFoundError("Place", 99))

        resp = await client.delete("/api/places/99")

        assert resp.status_code == 404

    async def test_no_auth_returns_401(self, client):
        resp = await client.delete("/api/places/1")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/places/{place_id}/like
# DELETE /api/places/{place_id}/like
# ---------------------------------------------------------------------------

class TestLikeUnlikePlace:
    async def test_like_success(self, place_client):
        client, service, _ = place_client
        service.like_place = AsyncMock(return_value={
            "likes_count": 5,
            "message": "Successfully liked Vinyl Shop",
        })

        resp = await client.post("/api/places/1/like")

        assert resp.status_code == 200
        body = resp.json()
        assert body["is_liked"] is True
        assert body["likes_count"] == 5

    async def test_like_already_liked_returns_200_idempotent(self, place_client):
        client, service, _ = place_client
        service.like_place = AsyncMock(return_value={
            "likes_count": 5,
            "message": "Already liked Vinyl Shop",
        })

        resp = await client.post("/api/places/1/like")

        assert resp.status_code == 200
        body = resp.json()
        assert body["is_liked"] is True
        assert body["likes_count"] == 5

    async def test_unlike_success(self, place_client):
        client, service, _ = place_client
        service.unlike_place = AsyncMock(return_value={
            "likes_count": 3,
            "message": "Successfully unliked Vinyl Shop",
        })

        resp = await client.delete("/api/places/1/like")

        assert resp.status_code == 200
        body = resp.json()
        assert body["is_liked"] is False
        assert body["likes_count"] == 3

    async def test_unlike_not_liked_returns_200_idempotent(self, place_client):
        client, service, _ = place_client
        service.unlike_place = AsyncMock(return_value={
            "likes_count": 3,
            "message": "Not liked Vinyl Shop",
        })

        resp = await client.delete("/api/places/1/like")

        assert resp.status_code == 200
        body = resp.json()
        assert body["is_liked"] is False
        assert body["likes_count"] == 3

    async def test_like_not_found_returns_404(self, place_client):
        client, service, _ = place_client
        service.like_place = AsyncMock(side_effect=ResourceNotFoundError("Place", 99))

        resp = await client.post("/api/places/99/like")

        assert resp.status_code == 404
