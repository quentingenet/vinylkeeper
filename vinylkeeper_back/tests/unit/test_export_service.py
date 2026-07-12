from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.services.export_service import ExportService
from app.core.exceptions import ForbiddenError, ResourceNotFoundError
from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum
from app.models.association_tables import CollectionArtist
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.reference_data.external_sources import ExternalSource
from app.models.reference_data.vinyl_state import VinylState


def make_service():
    collection_repo = AsyncMock()
    collection_album_repo = AsyncMock()
    return ExportService(collection_repo, collection_album_repo), collection_repo, collection_album_repo


def make_collection(collection_id=1, owner_id=1, name="My Collection") -> Collection:
    now = datetime.now(timezone.utc)
    return Collection(
        id=collection_id, name=name, description=None, is_public=True,
        owner_id=owner_id, mood_id=None, created_at=now, updated_at=now,
    )


class TestGetOwnedCollection:
    async def test_not_found_raises(self):
        service, collection_repo, _ = make_service()
        collection_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service._get_owned_collection(collection_id=1, user_id=1)

    async def test_not_owner_raises(self):
        service, collection_repo, _ = make_service()
        collection_repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2))

        with pytest.raises(ForbiddenError):
            await service._get_owned_collection(collection_id=1, user_id=1)

    async def test_owner_succeeds(self):
        service, collection_repo, _ = make_service()
        collection = make_collection(owner_id=1)
        collection_repo.get_by_id = AsyncMock(return_value=collection)

        result = await service._get_owned_collection(collection_id=1, user_id=1)
        assert result is collection


class TestSplitAlbumTitle:
    def test_splits_on_dash_separator(self):
        service, *_ = make_service()
        artist, album = service._split_album_title("Daft Punk - Discovery")
        assert artist == "Daft Punk"
        assert album == "Discovery"

    def test_no_separator_returns_full_title_as_album(self):
        service, *_ = make_service()
        artist, album = service._split_album_title("Discovery")
        assert artist == ""
        assert album == "Discovery"

    def test_only_splits_once_on_first_separator(self):
        service, *_ = make_service()
        artist, album = service._split_album_title("A - B - C")
        assert artist == "A"
        assert album == "B - C"

    def test_none_returns_empty_strings(self):
        service, *_ = make_service()
        assert service._split_album_title(None) == ("", "")

    def test_empty_string_returns_empty_strings(self):
        service, *_ = make_service()
        assert service._split_album_title("") == ("", "")


class TestBuildFilename:
    def test_sanitizes_special_characters(self):
        service, *_ = make_service()
        collection = make_collection(collection_id=42, name="My Collection! (2024)")
        filename = service._build_filename(collection, suffix="albums.csv")
        assert filename.startswith("My_Collection___2024_42_")
        assert filename.endswith("_albums.csv")

    def test_missing_name_falls_back_to_default(self):
        # Collection.name is validated non-empty at the ORM level, so this
        # exercises _build_filename's `collection.name or "collection"`
        # fallback via a lightweight stand-in rather than a real Collection.
        service, *_ = make_service()

        class _CollectionStub:
            id = 7
            name = None

        filename = service._build_filename(_CollectionStub(), suffix="artists.ods")
        assert filename.startswith("collection_7_")

    def test_keeps_dashes_and_underscores(self):
        service, *_ = make_service()
        collection = make_collection(collection_id=1, name="my-collection_v2")
        filename = service._build_filename(collection, suffix="albums.csv")
        assert filename.startswith("my-collection_v2_1_")


class TestVinylStateName:
    def test_none_returns_empty_string(self):
        service, *_ = make_service()
        assert service._vinyl_state_name(None) == ""

    def test_real_vinyl_state_returns_name(self):
        service, *_ = make_service()
        state = VinylState(id=1, name="mint", description=None)
        assert service._vinyl_state_name(state) == "mint"


class TestFormatDt:
    def test_none_returns_empty_string(self):
        service, *_ = make_service()
        assert service._format_dt(None) == ""

    def test_datetime_returns_isoformat(self):
        service, *_ = make_service()
        dt = datetime(2024, 6, 15, 12, 30, tzinfo=timezone.utc)
        assert service._format_dt(dt) == dt.isoformat()


class TestAlbumToCsvRow:
    def test_row_matches_headers_length(self):
        service, *_ = make_service()
        now = datetime.now(timezone.utc)
        source = ExternalSource(id=1, name="discogs")
        album = Album(
            id=10, external_album_id="123", external_source_id=1,
            title="Daft Punk - Discovery", image_url="http://example.com/cover.jpg",
            created_at=now, updated_at=now,
        )
        album.external_source = source
        collection_album = CollectionAlbum(
            collection_id=1, album_id=10, acquisition_month_year="2024-06",
            created_at=now, updated_at=now,
        )
        collection = make_collection(collection_id=1)

        row = service._album_to_csv_row(album, collection_album, collection)

        assert len(row) == len(service._album_csv_headers())
        assert row[4] == "discogs"
        assert row[5] == "Daft Punk"
        assert row[6] == "Discovery"

    def test_unloaded_external_source_does_not_crash(self):
        """Regression guard: Album.external_source is lazy="raise" — a
        transient Album that never had it set must not crash the export,
        matching the is_loaded() guard added during the lazy-loading
        migration."""
        service, *_ = make_service()
        now = datetime.now(timezone.utc)
        album = Album(
            id=10, external_album_id="123", external_source_id=1,
            title="Discovery", image_url=None, created_at=now, updated_at=now,
        )
        collection_album = CollectionAlbum(
            collection_id=1, album_id=10, created_at=now, updated_at=now,
        )
        collection = make_collection(collection_id=1)

        row = service._album_to_csv_row(album, collection_album, collection)

        assert row[4] == ""


class TestArtistToCsvRow:
    def test_row_matches_headers_length(self):
        service, *_ = make_service()
        now = datetime.now(timezone.utc)
        source = ExternalSource(id=1, name="musicbrainz")
        artist = Artist(
            id=20, external_artist_id="456", external_source_id=1,
            title="Daft Punk", image_url=None, created_at=now, updated_at=now,
        )
        artist.external_source = source
        collection_artist = CollectionArtist(
            collection_id=1, artist_id=20, created_at=now, updated_at=now,
        )
        collection = make_collection(collection_id=1)

        row = service._artist_to_csv_row(artist, collection_artist, collection)

        assert len(row) == len(service._artist_csv_headers())
        assert row[4] == "musicbrainz"
        assert row[5] == "Daft Punk"


class TestStreamCsv:
    async def test_produces_bom_prefixed_csv_content(self):
        service, *_ = make_service()

        def rows():
            yield ["header1", "header2"]
            yield ["value1", "value2"]

        response = service._stream_csv(filename="test.csv", rows=rows())

        chunks = [chunk async for chunk in response.body_iterator]
        content = b"".join(
            c.encode("utf-8") if isinstance(c, str) else c for c in chunks
        ).decode("utf-8")

        assert content.startswith("﻿")
        assert "header1;header2" in content
        assert "value1;value2" in content
        assert response.headers["content-disposition"] == 'attachment; filename="test.csv"'


class TestBuildOdsFile:
    def test_produces_non_empty_ods_bytes(self):
        service, *_ = make_service()

        export_file = service._build_ods_file(
            filename="test.ods",
            sheet_name="Albums",
            headers=["col1", "col2"],
            rows=[["a", "b"], ["c", "d"]],
        )

        assert export_file.filename == "test.ods"
        assert export_file.media_type == "application/vnd.oasis.opendocument.spreadsheet"
        assert len(export_file.content) > 0
        # ODS files are zip archives
        assert export_file.content[:2] == b"PK"
