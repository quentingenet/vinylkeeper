import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.deps.deps import get_collection_service
from app.utils.auth_utils.auth import get_current_user
from app.schemas.collection_album_schema import CollectionAlbumCopyResponse
from app.schemas.collection_schema import CollectionAlbumResponse, CollectionSearchResponse
from app.core.exceptions import (
    DuplicateCollectionNameError,
    ForbiddenError,
    ResourceNotFoundError,
    DuplicateFieldError,
    ValidationError,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

def _make_collection(collection_id: int = 1, owner_id: int = 1, is_public: bool = True):
    col = MagicMock()
    col.id = collection_id
    col.owner_id = owner_id
    col.is_public = is_public
    col.name = "My Collection"
    col.description = None
    col.mood_id = None
    col.collection_albums = []
    col.collection_artists = []
    col.owner = None
    col.created_at = datetime.now(timezone.utc)
    col.updated_at = datetime.now(timezone.utc)
    return col


@pytest.fixture
def mock_collection_service():
    return AsyncMock()


@pytest.fixture
async def coll_client(mock_user, mock_collection_service):
    """auth_client variant with collection_service override."""
    async def override_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_collection_service] = lambda: mock_collection_service

    from unittest.mock import patch
    from httpx import AsyncClient, ASGITransport

    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            from app.utils.auth_utils.auth import create_token, TokenType
            c.cookies.set("access_token", create_token(str(mock_user.user_uuid), TokenType.ACCESS))
            yield c, mock_collection_service, mock_user

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /api/collections/add
# ---------------------------------------------------------------------------

class TestCreateCollection:
    async def test_success_returns_201(self, coll_client):
        client, service, user = coll_client
        col = _make_collection(owner_id=user.id)
        service.create_collection = AsyncMock(return_value=col)

        resp = await client.post("/api/collections/add", json={
            "name": "New Collection",
            "description": None,
            "is_public": False,
            "mood_id": None,
            "album_ids": [],
            "artist_ids": [],
        })

        assert resp.status_code == 201
        body = resp.json()
        assert "collection_id" in body
        assert body["collection_id"] == col.id

    async def test_duplicate_name_returns_400(self, coll_client):
        client, service, _ = coll_client
        service.create_collection = AsyncMock(
            side_effect=DuplicateCollectionNameError("My Collection")
        )

        resp = await client.post("/api/collections/add", json={
            "name": "My Collection",
            "description": None,
            "is_public": False,
            "mood_id": None,
            "album_ids": [],
            "artist_ids": [],
        })

        assert resp.status_code == 400
        body = resp.json()
        assert "code" in body
        assert "message" in body

    async def test_no_auth_returns_401(self, client):
        resp = await client.post("/api/collections/add", json={
            "name": "Test",
            "description": None,
            "is_public": False,
            "mood_id": None,
            "album_ids": [],
            "artist_ids": [],
        })
        assert resp.status_code == 401

    async def test_missing_body_returns_422(self, coll_client):
        client, *_ = coll_client
        resp = await client.post("/api/collections/add", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/collections/{collection_id}
# ---------------------------------------------------------------------------

class TestGetCollectionById:
    async def test_success_returns_200(self, coll_client):
        client, service, user = coll_client
        col = _make_collection(owner_id=user.id, is_public=True)
        service.get_collection_by_id = AsyncMock(return_value=col)

        resp = await client.get("/api/collections/1")

        assert resp.status_code == 200

    async def test_not_found_returns_404(self, coll_client):
        client, service, _ = coll_client
        service.get_collection_by_id = AsyncMock(
            side_effect=ResourceNotFoundError("Collection", 99)
        )

        resp = await client.get("/api/collections/99")

        assert resp.status_code == 404
        assert resp.json()["code"] == 2000

    async def test_private_foreign_returns_403(self, coll_client):
        client, service, _ = coll_client
        service.get_collection_by_id = AsyncMock(side_effect=ForbiddenError())

        resp = await client.get("/api/collections/5")

        assert resp.status_code == 403
        assert resp.json()["code"] == 4030

    async def test_no_auth_returns_401(self, client):
        resp = await client.get("/api/collections/1")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/collections/{collection_id}
# ---------------------------------------------------------------------------

class TestDeleteCollection:
    async def test_success_returns_200(self, coll_client):
        client, service, _ = coll_client
        service.delete_collection = AsyncMock(return_value=True)

        resp = await client.delete("/api/collections/1")

        assert resp.status_code == 200
        assert resp.json() == {"message": "Collection deleted successfully"}

    async def test_not_owner_returns_403(self, coll_client):
        client, service, _ = coll_client
        service.delete_collection = AsyncMock(side_effect=ForbiddenError())

        resp = await client.delete("/api/collections/2")

        assert resp.status_code == 403

    async def test_not_found_returns_404(self, coll_client):
        client, service, _ = coll_client
        service.delete_collection = AsyncMock(
            side_effect=ResourceNotFoundError("Collection", 99)
        )

        resp = await client.delete("/api/collections/99")

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/collections/{collection_id}/like
# DELETE /api/collections/{collection_id}/like
# ---------------------------------------------------------------------------

class TestLikeUnlikeCollection:
    async def test_like_success(self, coll_client):
        client, service, _ = coll_client
        service.like_collection = AsyncMock(return_value={
            "is_liked": True,
            "likes_count": 5,
            "message": "Collection liked successfully",
        })

        resp = await client.post("/api/collections/1/like")

        assert resp.status_code == 200
        body = resp.json()
        assert body["liked"] is True
        assert body["likes_count"] == 5

    async def test_like_already_liked_returns_400(self, coll_client):
        client, service, _ = coll_client
        service.like_collection = AsyncMock(
            side_effect=DuplicateFieldError("Collection like", "1")
        )

        resp = await client.post("/api/collections/1/like")

        assert resp.status_code == 400

    async def test_unlike_success(self, coll_client):
        client, service, _ = coll_client
        service.unlike_collection = AsyncMock(return_value={
            "is_liked": False,
            "likes_count": 3,
            "message": "Collection unliked successfully",
        })

        resp = await client.delete("/api/collections/1/like")

        assert resp.status_code == 200
        body = resp.json()
        assert body["liked"] is False
        assert body["likes_count"] == 3

    async def test_unlike_not_liked_returns_404(self, coll_client):
        client, service, _ = coll_client
        service.unlike_collection = AsyncMock(
            side_effect=ResourceNotFoundError("Collection like", 1)
        )

        resp = await client.delete("/api/collections/1/like")

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/collections/update/{collection_id}
# ---------------------------------------------------------------------------

class TestUpdateCollection:
    async def test_success_returns_200(self, coll_client):
        client, service, _ = coll_client
        updated = _make_collection()
        service.update_collection = AsyncMock(return_value=updated)

        resp = await client.patch("/api/collections/update/1", json={
            "name": "Renamed Collection",
            "description": None,
            "is_public": None,
            "mood_id": None,
        })

        assert resp.status_code == 200
        assert "message" in resp.json()

    async def test_duplicate_name_returns_400(self, coll_client):
        client, service, _ = coll_client
        service.update_collection = AsyncMock(
            side_effect=DuplicateCollectionNameError("Taken")
        )

        resp = await client.patch("/api/collections/update/1", json={
            "name": "Taken",
            "description": None,
            "is_public": None,
            "mood_id": None,
        })

        assert resp.status_code == 400

    async def test_not_owner_returns_403(self, coll_client):
        client, service, _ = coll_client
        service.update_collection = AsyncMock(side_effect=ForbiddenError())

        resp = await client.patch("/api/collections/update/1", json={
            "name": "Someone Else",
            "description": None,
            "is_public": None,
            "mood_id": None,
        })

        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/collections/{collection_id}/search
# ---------------------------------------------------------------------------

class TestSearchCollectionItems:
    async def test_success_returns_results(self, coll_client):
        client, service, _ = coll_client
        service.search_collection_items = AsyncMock(return_value=CollectionSearchResponse(
            albums=[],
            artists=[],
            query="blue",
            search_type="album",
        ))

        resp = await client.get("/api/collections/1/search?q=blue&search_type=album")

        assert resp.status_code == 200
        body = resp.json()
        assert "albums" in body

    async def test_missing_query_param_returns_422(self, coll_client):
        client, *_ = coll_client
        resp = await client.get("/api/collections/1/search")
        assert resp.status_code == 422

    async def test_private_non_owner_returns_403(self, coll_client):
        client, service, _ = coll_client
        service.search_collection_items = AsyncMock(side_effect=ForbiddenError())

        resp = await client.get("/api/collections/1/search?q=rock&search_type=both")

        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Copies of an album
# ---------------------------------------------------------------------------

def _album_with_copies() -> CollectionAlbumResponse:
    now = datetime.now(timezone.utc)
    return CollectionAlbumResponse(
        id=10, external_album_id="123", external_source_id=1, title="Brel - Brel",
        created_at=now, updated_at=now, state_record="mint",
        copies=[CollectionAlbumCopyResponse(id=1, state_record="mint", created_at=now, updated_at=now),
                CollectionAlbumCopyResponse(id=2, state_cover="good", created_at=now)],
        copies_count=2,
    )


class TestAlbumCopies:
    async def test_add_copy_returns_201_with_all_copies(self, coll_client):
        client, service, user = coll_client
        service.add_album_copy = AsyncMock(return_value=_album_with_copies())

        resp = await client.post("/api/collections/1/albums/10/copies", json={"state_cover": "good"})

        assert resp.status_code == 201
        assert resp.json()["copies_count"] == 2
        first = resp.json()["copies"][0]
        assert first["updated_at"] == first["created_at"]
        args = service.add_album_copy.await_args.args
        assert args[:3] == (user.id, 1, 10)
        assert args[3].model_dump(exclude_unset=True) == {"state_cover": "good"}

    async def test_update_copy_sends_only_the_fields_given(self, coll_client):
        client, service, _ = coll_client
        service.update_album_copy = AsyncMock(return_value=_album_with_copies())

        resp = await client.patch("/api/collections/1/albums/10/copies/2", json={"state_record": None})

        assert resp.status_code == 200
        assert service.update_album_copy.await_args.args[3] == 2
        assert service.update_album_copy.await_args.args[4].model_dump(exclude_unset=True) == {"state_record": None}

    async def test_invalid_acquisition_date_returns_422(self, coll_client):
        client, *_ = coll_client
        resp = await client.post("/api/collections/1/albums/10/copies", json={"acquisition_month_year": "2024-13"})
        assert resp.status_code == 422

    async def test_deleting_the_last_copy_returns_400(self, coll_client):
        client, service, _ = coll_client
        service.delete_album_copy = AsyncMock(
            side_effect=ValidationError(error_code=2002, message="An album keeps at least one copy"))

        resp = await client.delete("/api/collections/1/albums/10/copies/1")

        assert resp.status_code == 400

    async def test_anonymous_request_returns_401(self, client):
        resp = await client.post("/api/collections/1/albums/10/copies", json={})
        assert resp.status_code == 401


class TestConfirmPressing:
    async def test_confirm_returns_the_album(self, coll_client):
        client, service, user = coll_client
        service.confirm_album_pressing = AsyncMock(return_value=_album_with_copies())

        resp = await client.post("/api/collections/1/albums/10/pressing/confirm")

        assert resp.status_code == 200
        service.confirm_album_pressing.assert_awaited_once_with(user.id, 1, 10)

    async def test_non_owner_gets_403(self, coll_client):
        client, service, _ = coll_client
        service.confirm_album_pressing = AsyncMock(side_effect=ForbiddenError())

        resp = await client.post("/api/collections/1/albums/10/pressing/confirm")

        assert resp.status_code == 403
