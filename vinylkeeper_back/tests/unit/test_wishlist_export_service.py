from datetime import datetime, timezone
from unittest.mock import AsyncMock

from app.services.wishlist_export_service import WishlistExportService
from app.models.wishlist_model import Wishlist
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.external_sources import ExternalSource


def make_service():
    wishlist_repo = AsyncMock()
    return WishlistExportService(wishlist_repo), wishlist_repo


class TestBuildFilename:
    def test_sanitizes_special_characters(self):
        service, _ = make_service()
        filename = service._build_filename(username="Jane Doe!", suffix="wishlist.csv")
        assert filename.startswith("wishlist_Jane_Doe_")
        assert filename.endswith("_wishlist.csv")

    def test_missing_username_falls_back_to_default(self):
        service, _ = make_service()
        filename = service._build_filename(username="", suffix="wishlist.ods")
        assert filename.startswith("wishlist_user_")


class TestRow:
    def test_full_item_produces_expected_row(self):
        service, _ = make_service()
        now = datetime(2024, 6, 15, 12, 0, tzinfo=timezone.utc)
        item = Wishlist(
            id=1, user_id=1, external_id="123", entity_type_id=1,
            external_source_id=1, title="Discovery", image_url="http://x/y.jpg",
            created_at=now,
        )
        item.entity_type = EntityType(id=1, name="album")
        item.external_source = ExternalSource(id=1, name="discogs")

        row = service._row(item)

        assert row == ["1", "album", "123", "discogs", "Discovery", "http://x/y.jpg", now.isoformat()]
        assert len(row) == len(service._headers())

    def test_missing_optional_fields_default_to_empty_string(self):
        service, _ = make_service()
        item = Wishlist(
            id=2, user_id=1, external_id="456", entity_type_id=2,
            external_source_id=2, title=None, image_url=None, created_at=None,
        )
        item.entity_type = None
        item.external_source = None

        row = service._row(item)

        assert row == ["2", "", "456", "", "", "", ""]


class TestStreamCsv:
    async def test_produces_bom_prefixed_csv_content(self):
        service, _ = make_service()

        def rows():
            yield ["a", "b"]
            yield ["1", "2"]

        response = service._stream_csv(filename="wishlist.csv", rows=rows())

        chunks = [chunk async for chunk in response.body_iterator]
        content = b"".join(
            c.encode("utf-8") if isinstance(c, str) else c for c in chunks
        ).decode("utf-8")

        assert content.startswith("﻿")
        assert "a;b" in content
        assert "1;2" in content


class TestBuildOds:
    def test_produces_non_empty_ods_bytes(self):
        service, _ = make_service()
        content = service._build_ods(sheet_name="Wishlist", headers=["a", "b"], rows=[["1", "2"]])
        assert len(content) > 0
        assert content[:2] == b"PK"


class TestExportMyWishlistCsv:
    async def test_uses_repository_items_and_builds_response(self):
        service, wishlist_repo = make_service()
        now = datetime.now(timezone.utc)
        item = Wishlist(
            id=1, user_id=1, external_id="123", entity_type_id=1,
            external_source_id=1, title="Discovery", image_url=None, created_at=now,
        )
        item.entity_type = EntityType(id=1, name="album")
        item.external_source = ExternalSource(id=1, name="discogs")
        wishlist_repo.get_user_wishlist_all = AsyncMock(return_value=[item])

        response = await service.export_my_wishlist_csv(user_id=1, username="jane")

        chunks = [chunk async for chunk in response.body_iterator]
        content = b"".join(
            c.encode("utf-8") if isinstance(c, str) else c for c in chunks
        ).decode("utf-8")
        assert "Discovery" in content
        assert response.headers["content-disposition"].startswith('attachment; filename="wishlist_jane_')
