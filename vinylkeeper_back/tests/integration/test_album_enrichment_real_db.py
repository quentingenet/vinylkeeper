"""
Real-database tests for the album enrichment columns (migration 8606fe5a06aa)
and AlbumEnrichmentRepository. Same safety model as test_real_db_relationships.py:
everything runs in an outer transaction that is rolled back.
"""
import uuid
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.album_model import Album
from app.repositories.album_enrichment_repository import AlbumEnrichmentRepository
from app.services.album_enrichment_service import parse_release


async def make_discogs_album(session: AsyncSession, **values) -> Album:
    discogs_id = (await session.execute(
        text("SELECT id FROM external_sources WHERE name = 'discogs'")
    )).scalar_one()
    album = Album(
        external_album_id=str(uuid.uuid4().int)[:12],
        external_source_id=discogs_id,
        title="itest album",
        **values,
    )
    session.add(album)
    await session.flush()
    return album


async def reload(session: AsyncSession, album_id: int) -> Album:
    session.expire_all()
    return (await session.execute(select(Album).filter(Album.id == album_id))).scalar_one()


class TestEnrichmentColumns:
    async def test_release_values_are_persisted(self, real_session):
        album = await make_discogs_album(real_session)
        repository = AlbumEnrichmentRepository(real_session)
        values = parse_release({
            "year": 1979, "master_id": 8522, "genres": ["Rock"], "styles": ["Hard Rock"],
            "artists": [{"name": "AC/DC"}],
        })

        await repository.save_release(album.id, values)
        saved = await reload(real_session, album.id)

        assert saved.release_year == 1979
        assert saved.external_master_id == "8522"
        assert saved.genres == ["Rock"] and saved.styles == ["Hard Rock"]
        assert saved.artist_name == "AC/DC"
        assert saved.enrichment_status == "pending_master"
        assert saved.enriched_at is not None

    async def test_unknown_status_is_rejected(self, real_session):
        album = await make_discogs_album(real_session)

        with pytest.raises(IntegrityError):
            async with real_session.begin_nested():
                await real_session.execute(
                    text("UPDATE albums SET enrichment_status = 'done' WHERE id = :id"), {"id": album.id})

    async def test_genre_lookup_uses_array_containment(self, real_session):
        album = await make_discogs_album(real_session, genres=["Jazz", "Funk / Soul"])

        found = (await real_session.execute(
            select(Album.id).filter(Album.genres.contains(["Jazz"]), Album.id == album.id)
        )).scalar_one_or_none()

        assert found == album.id


class TestEnrichmentRepository:
    async def test_pending_releases_include_only_unenriched_albums(self, real_session):
        pending = await make_discogs_album(real_session)
        done = await make_discogs_album(real_session)
        repository = AlbumEnrichmentRepository(real_session)
        await repository.mark_release_not_found(done.id)

        pending_ids = {album_id for album_id, _ in await repository.list_pending_releases()}

        assert pending.id in pending_ids
        assert done.id not in pending_ids
        assert await repository.get_pending_release_by_external_id(pending.external_album_id) == pending.id
        assert await repository.get_pending_release_by_external_id(done.external_album_id) is None

    async def test_master_year_closes_every_pressing_of_the_master(self, real_session):
        master = f"itest-{uuid.uuid4().hex[:8]}"
        first = await make_discogs_album(real_session, external_master_id=master, enrichment_status="pending_master")
        second = await make_discogs_album(real_session, external_master_id=master, enrichment_status="pending_master")
        repository = AlbumEnrichmentRepository(real_session)

        assert master in await repository.list_pending_masters()
        assert await repository.get_pending_master(first.id) == master
        assert await repository.save_master_year(master, 1959) == 2

        for album_id in (first.id, second.id):
            saved = await reload(real_session, album_id)
            assert (saved.original_year, saved.enrichment_status) == (1959, "ok")
        assert await repository.find_known_original_year(master) == 1959
        assert master not in await repository.list_pending_masters()


class TestPressingDetailsCatchUp:
    async def test_pending_editions_are_enriched_albums_without_formats(self, real_session):
        old = await make_discogs_album(real_session, enrichment_status="ok", enriched_at=func.now())
        caught_up = await make_discogs_album(real_session, enrichment_status="ok", enriched_at=func.now(), formats=[])
        not_enriched = await make_discogs_album(real_session)
        gone = await make_discogs_album(real_session, enrichment_status="not_found", enriched_at=func.now())

        pending = await AlbumEnrichmentRepository(real_session).list_pending_editions()
        pending_ids = {album_id for album_id, _ in pending}

        assert old.id in pending_ids
        assert not pending_ids & {caught_up.id, not_enriched.id, gone.id}

    async def test_save_edition_leaves_the_rest_of_the_album_untouched(self, real_session):
        album = await make_discogs_album(real_session, enrichment_status="ok", enriched_at=func.now(),
                                         release_year=2010, original_year=1959, genres=["Jazz"])

        await AlbumEnrichmentRepository(real_session).save_edition(
            album.id, {"country": "US", "label": "Columbia", "catno": "CS 8163", "formats": ["LP", "Stereo"]})

        saved = await reload(real_session, album.id)
        assert (saved.country, saved.label, saved.catno) == ("US", "Columbia", "CS 8163")
        assert saved.formats == ["LP", "Stereo"]
        assert (saved.release_year, saved.original_year, saved.genres) == (2010, 1959, ["Jazz"])

    async def test_parsed_release_fits_the_columns(self, real_session):
        album = await make_discogs_album(real_session)
        values = parse_release({"id": 1, "country": "x" * 300,
                                "labels": [{"name": "y" * 600, "catno": "z" * 300}]})

        await AlbumEnrichmentRepository(real_session).save_release(album.id, values)

        saved = await reload(real_session, album.id)
        assert (len(saved.country), len(saved.label), len(saved.catno)) == (100, 512, 255)
