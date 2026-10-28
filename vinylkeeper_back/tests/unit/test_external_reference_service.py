from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError as PydanticValidationError

from app.core.enums import EntityTypeEnum
from app.core.exceptions import ServerError
from app.models.collection_album import CollectionAlbum
from app.schemas.external_reference_schema import AddToCollectionRequest
from app.services.external_reference_service import ExternalReferenceService


class TrackingContext:
    def __init__(self, flag: dict[str, bool]):
        self.flag = flag

    async def __aenter__(self):
        self.flag["entered"] = True
        return MagicMock()

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.mark.asyncio
async def test_add_to_collection_runs_repo_work_inside_transaction_context():
    repo = MagicMock()
    repo.db = MagicMock()
    service = ExternalReferenceService(repo)

    request = AddToCollectionRequest(
        external_id="ext-123",
        entity_type=EntityTypeEnum.ALBUM,
        title="Test Album",
        image_url="https://i.discogs.com/cover.jpg",
        source="discogs",
    )

    collection = MagicMock()
    collection.id = 7
    collection.name = "My Collection"
    collection.owner_id = 1
    collection.created_at = datetime.now(timezone.utc)

    album = MagicMock()
    album.id = 99

    collection_album = CollectionAlbum(
        collection_id=collection.id,
        album_id=album.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    entered = {"entered": False}

    async def fake_add_album_to_collection(*args, **kwargs):
        assert entered["entered"] is True
        return collection_album, True

    service._verify_collection_access = AsyncMock(return_value=collection)
    service._find_or_create_entity = AsyncMock(return_value=(album, True))
    repo.get_external_source_id = AsyncMock(return_value=1)
    repo.add_album_to_collection = AsyncMock(side_effect=fake_add_album_to_collection)

    with patch(
        "app.services.external_reference_service.transaction_context",
        return_value=TrackingContext(entered),
    ):
        response = await service.add_to_collection(1, collection.id, request)

    assert response.is_new is True
    assert response.collection_name == collection.name


@pytest.mark.asyncio
async def test_add_to_collection_unexpected_error_raises_server_error():
    repo = MagicMock()
    repo.db = MagicMock()
    service = ExternalReferenceService(repo)

    request = AddToCollectionRequest(
        external_id="ext-456",
        entity_type=EntityTypeEnum.ALBUM,
        title="Failing Album",
        image_url="https://i.discogs.com/cover.jpg",
        source="discogs",
    )

    service._verify_collection_access = AsyncMock(
        side_effect=RuntimeError("unexpected DB failure")
    )

    with patch("app.services.external_reference_service.transaction_context") as mock_tx:
        mock_tx.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        mock_tx.return_value.__aexit__ = AsyncMock(return_value=False)

        with pytest.raises(ServerError):
            await service.add_to_collection(1, 7, request)


class TestExternalReferenceSchema:
    """title and image_url come from the client: bounded until the enrichment replaces them."""

    BODY = {"external_id": "380980", "entity_type": "album", "title": "AC/DC - Highway To Hell",
            "image_url": "https://i.discogs.com/abc.jpg", "source": "discogs"}

    def test_discogs_image_and_empty_image_are_accepted(self):
        assert AddToCollectionRequest(**self.BODY).image_url == "https://i.discogs.com/abc.jpg"
        assert AddToCollectionRequest(**{**self.BODY, "image_url": ""}).image_url == ""

    @pytest.mark.parametrize("image_url", [
        "https://evil.example/a.jpg", "http://i.discogs.com/a.jpg", "javascript:alert(1)",
        "https://i.discogs.com.evil.example/a.jpg",
    ])
    def test_image_outside_the_discogs_cdn_is_refused(self, image_url):
        with pytest.raises(PydanticValidationError):
            AddToCollectionRequest(**{**self.BODY, "image_url": image_url})

    @pytest.mark.parametrize("field, value", [("title", "x" * 513), ("external_id", ""), ("external_id", "1" * 256)])
    def test_lengths_are_bounded(self, field, value):
        with pytest.raises(PydanticValidationError):
            AddToCollectionRequest(**{**self.BODY, field: value})
