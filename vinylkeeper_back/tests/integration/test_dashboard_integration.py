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
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.place_repository import PlaceRepository
from app.models.reference_data.place_types import PlaceType
from sqlalchemy import select

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import (
    make_collection_service,
    make_test_collection,
    pick_existing_album_id,
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
        service = make_collection_service(real_session)
        await service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=_album_create(album_id, collection.id),
        )

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
        service = make_collection_service(real_session)
        await service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=_album_create(album_id, collection.id),
        )

        after = await repo.get_global_collections_counts()
        assert after["albums_total"] == before["albums_total"] + 1


class TestPublicCollectionsCount:
    async def test_public_collection_with_album_increases_count(self, real_session):
        repo = DashboardRepository(real_session)
        before = await repo.get_public_collections_count()

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)
        service = make_collection_service(real_session)
        await service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=_album_create(album_id, collection.id),
        )

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
        place_repo = PlaceRepository(real_session)
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
        service = make_collection_service(real_session)
        await service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=_album_create(album_id, collection.id),
        )

        repo = DashboardRepository(real_session)
        result = await repo.get_latest_album()

        assert result is not None
        album, username, updated_at = result
        assert album.id == album_id
        assert username == user.username


def _album_create(album_id: int, collection_id: int):
    from app.schemas.collection_album_schema import CollectionAlbumCreate
    return CollectionAlbumCreate(album_id=album_id, collection_id=collection_id)
