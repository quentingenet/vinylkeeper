"""
Real-database integration tests for the Dashboard domain (aggregate stats).

Same safety model as test_real_db_relationships.py: real_session runs every
test inside an outer transaction + SAVEPOINT that is rolled back at the end.

User-scoped counts (get_user_stats_batch) are asserted exactly, since a
freshly created test user starts at zero. Global counts (get_global_
collections_counts, get_places_counts_batch, get_public_collections_count)
run against a copy-of-production dataset with pre-existing rows, so they are
asserted as deltas (before/after our own insert) rather than exact values.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.models.album_model import Album
from app.repositories.collection_repository import CollectionRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.atlas_repository import AtlasRepository
from app.models.reference_data.place_types import PlaceType
from sqlalchemy import select, text
from app.models.collection_album import CollectionAlbum
from app.models.collection_model import Collection

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import (
    make_test_collection,
    pick_existing_album_id,
    put_album_in_collection,
)


class TestUserStatsBatch:
    async def test_fresh_user_has_zero_counts(self, real_session):
        user = await make_test_user(real_session)
        repo = DashboardRepository(real_session)

        stats = await repo.get_user_stats_batch(user.id)

        assert stats == {
            "albums_total": 0,
            "artists_total": 0,
            "collections_total": 0,
            "public_collections_total": 0,
        }

    async def test_counts_reflect_created_collection_and_album(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)
        await put_album_in_collection(real_session, collection.id, album_id)

        repo = DashboardRepository(real_session)
        stats = await repo.get_user_stats_batch(user.id)

        assert stats["albums_total"] == 1
        assert stats["collections_total"] == 1
        assert stats["public_collections_total"] == 1  # make_test_collection creates public collections


class TestGlobalCollectionsCounts:
    async def test_album_addition_increases_global_count(self, real_session):
        repo = DashboardRepository(real_session)
        before = await repo.get_global_collections_counts()

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)
        await put_album_in_collection(real_session, collection.id, album_id)

        after = await repo.get_global_collections_counts()
        assert after["albums_total"] == before["albums_total"] + 1


class TestPublicCollectionsCount:
    async def test_public_collection_with_album_increases_count(self, real_session):
        repo = DashboardRepository(real_session)
        before = await repo.get_public_collections_count()

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)
        await put_album_in_collection(real_session, collection.id, album_id)

        after = await repo.get_public_collections_count()
        assert after == before + 1


class TestPlacesCountsBatch:
    async def test_moderated_place_increases_both_counts(self, real_session):
        repo = DashboardRepository(real_session)
        before = await repo.get_places_counts_batch()

        user = await make_test_user(real_session)
        place_type_id = (
            await real_session.execute(select(PlaceType.id).limit(1))
        ).scalar_one()
        place_repo = AtlasRepository(real_session)
        place = await place_repo.create_place({
            "name": "Integration Test Record Store",
            "address": "1 Test Street",
            "city": "Paris",
            "country": "France",
            "place_type_id": place_type_id,
            "latitude": 48.8566,
            "longitude": 2.3522,
            "submitted_by_id": user.id,
            "is_moderated": True,
        })

        after = await repo.get_places_counts_batch()
        assert after["global_total"] == before["global_total"] + 1
        assert after["moderated_total"] == before["moderated_total"] + 1
        assert place.is_moderated is True


class TestLatestAlbum:
    async def test_newly_added_album_becomes_latest(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)
        await put_album_in_collection(real_session, collection.id, album_id)

        repo = DashboardRepository(real_session)
        result = await repo.get_latest_album()

        assert result is not None
        album, username, updated_at = result
        assert album.id == album_id
        assert username == user.username


class TestRecentAlbumsOnePerWork:
    @staticmethod
    async def kind_of_blue_twice(session):
        """Two pressings of one work and another record, added after anything in the database."""
        user = await make_test_user(session)
        collection = await make_test_collection(session, owner_id=user.id)
        original, reissue, other = (await session.execute(select(Album).order_by(Album.id).limit(3))).scalars().all()
        master = f"itest-{uuid.uuid4().hex[:8]}"
        original.external_master_id = master
        reissue.external_master_id = master
        other.external_master_id = None
        await CollectionRepository(session).add_albums(collection, [original.id, reissue.id, other.id])
        future = datetime.now(timezone.utc) + timedelta(days=365)
        rows = (await session.execute(select(CollectionAlbum).filter(
            CollectionAlbum.collection_id == collection.id))).scalars().all()
        for offset, row in enumerate(sorted(rows, key=lambda r: r.album_id)):
            row.updated_at = future + timedelta(minutes=offset)
        await session.flush()
        return original, reissue, other

    async def test_pressings_of_a_work_show_one_cover(self, real_session):
        original, reissue, other = await self.kind_of_blue_twice(real_session)

        recent = await DashboardRepository(real_session).get_recent_albums(limit=12)

        top_ids = [album.id for album, _, _ in recent[:2]]
        assert other.id in top_ids
        assert len({original.id, reissue.id} & set(top_ids)) == 1
        assert len({original.id, reissue.id} & {album.id for album, _, _ in recent}) == 1

    async def test_the_work_of_the_latest_album_is_left_out(self, real_session):
        original, reissue, other = await self.kind_of_blue_twice(real_session)

        recent = await DashboardRepository(real_session).get_recent_albums(limit=12, exclude_ids=[original.id])

        ids = {album.id for album, _, _ in recent}
        assert not ids & {original.id, reissue.id}
        assert other.id in ids


class TestMyAlbumsCountsWorks:
    async def test_sum_of_the_collection_counts(self, real_session):
        """Pressings of a work count once in a collection; a record kept in two collections counts in both."""
        original, reissue, other = await TestRecentAlbumsOnePerWork.kind_of_blue_twice(real_session)
        user_id = (await real_session.execute(
            select(Collection.owner_id).join(CollectionAlbum, CollectionAlbum.collection_id == Collection.id)
            .filter(CollectionAlbum.album_id == other.id).order_by(Collection.id.desc()).limit(1))).scalar_one()
        second = await make_test_collection(real_session, owner_id=user_id)
        await CollectionRepository(real_session).add_albums(second, [other.id])

        stats = await DashboardRepository(real_session).get_user_stats_batch(user_id)

        assert stats["albums_total"] == 3


async def make_pressing(session, **values) -> Album:
    """A Discogs album of its own work (no master): eras and genres count it alone."""
    discogs_id = (await session.execute(
        text("SELECT id FROM external_sources WHERE name = 'discogs'"))).scalar_one()
    album = Album(external_album_id=str(uuid.uuid4().int)[:12], external_source_id=discogs_id,
                  title="itest - pressing", **values)
    session.add(album)
    await session.flush()
    return album


class TestSavedCopiesInUserStats:
    async def test_a_saved_copy_does_not_double_my_albums(self, real_session):
        user = await make_test_user(real_session)
        kept = await make_test_collection(real_session, owner_id=user.id)
        saved = await make_test_collection(real_session, owner_id=user.id)
        saved.saved_from_collection_id = kept.id
        album_id = await pick_existing_album_id(real_session)
        await put_album_in_collection(real_session, kept.id, album_id)
        await put_album_in_collection(real_session, saved.id, album_id)
        await real_session.flush()

        stats = await DashboardRepository(real_session).get_user_stats_batch(user.id)

        assert stats["albums_total"] == 1


class TestCollectionBreakdown:
    async def test_pressings_by_year_country_and_format(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        original = await make_pressing(real_session, release_year=1959, original_year=1959, country="US",
                                       formats=["LP", "Album", "Mono"], genres=["Jazz"])
        reissue = await make_pressing(real_session, release_year=2015, original_year=1959, country="Europe",
                                      formats=["LP", "Reissue"], genres=["Jazz"])
        unknown = await make_pressing(real_session, country="US", formats=["7\""], genres=["Rock"])
        for album in (original, reissue, unknown):
            await put_album_in_collection(real_session, collection.id, album.id)
        repo = DashboardRepository(real_session)

        counts = await repo.pressing_counts(user.id)
        countries = await repo.pressing_countries(user.id)
        formats = dict(await repo.pressing_formats(user.id))

        assert (counts.originals, counts.reissues, counts.total) == (1, 1, 3)
        assert [tuple(row) for row in countries] == [("US", 2), ("Europe", 1)]
        assert formats == {"LP": 2, "Mono": 1, "Reissue": 1, "7\"": 1}  # "Album" tells nothing

    async def test_a_pressing_in_two_collections_counts_once_and_one_collection_can_be_picked(self, real_session):
        user = await make_test_user(real_session)
        first = await make_test_collection(real_session, owner_id=user.id)
        second = await make_test_collection(real_session, owner_id=user.id)
        shared = await make_pressing(real_session, country="UK")
        only_second = await make_pressing(real_session, country="UK")
        await put_album_in_collection(real_session, first.id, shared.id)
        await put_album_in_collection(real_session, second.id, shared.id)
        await put_album_in_collection(real_session, second.id, only_second.id)
        repo = DashboardRepository(real_session)

        assert (await repo.pressing_counts(user.id)).total == 2
        assert (await repo.pressing_counts(user.id, [first.id])).total == 1

    async def test_collections_to_pick_leave_out_saved_copies_and_empty_ones(self, real_session):
        user = await make_test_user(real_session)
        kept = await make_test_collection(real_session, owner_id=user.id)
        await make_test_collection(real_session, owner_id=user.id)  # empty
        saved = await make_test_collection(real_session, owner_id=user.id)
        saved.saved_from_collection_id = kept.id
        album = await make_pressing(real_session)
        await put_album_in_collection(real_session, kept.id, album.id)
        await put_album_in_collection(real_session, saved.id, album.id)
        await real_session.flush()

        collections = await DashboardRepository(real_session).stats_collections(user.id)

        assert [row.id for row in collections] == [kept.id]

    async def test_someone_elses_pressings_are_not_counted(self, real_session):
        user, other = await make_test_user(real_session), await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=other.id)
        await put_album_in_collection(real_session, collection.id, (await make_pressing(real_session)).id)

        assert (await DashboardRepository(real_session).pressing_counts(user.id)).total == 0
