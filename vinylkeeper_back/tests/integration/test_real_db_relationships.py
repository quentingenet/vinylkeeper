"""
Real-database integration tests (Phase B of the lazy-loading migration).

Every other test in this suite mocks repositories/models via MagicMock/AsyncMock,
which never exercises actual SQLAlchemy relationship loading — a MagicMock answers
True to hasattr() for anything and never raises sqlalchemy.exc.InvalidRequestError
or MissingGreenlet. These tests use a real AsyncSession against a live Postgres
database (a copy of production data) to actually verify the lazy="raise" relations
introduced in Phase C load correctly.

Safety: this database contains real copied production data. Every test runs inside
an outer transaction + SAVEPOINT (join_transaction_mode="create_savepoint") that is
rolled back at the end of the test, so nothing is ever permanently written — even
though the application code under test calls session.commit() internally via
transaction_context(), that only releases the SAVEPOINT, not the outer transaction.
"""
import uuid
import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum
from app.models.association_tables import CollectionArtist
from app.models.album_model import Album

from app.repositories.collection_repository import CollectionRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository

from app.services.collection_service import CollectionService
from app.services.external_reference_service import ExternalReferenceService

from app.schemas.collection_album_schema import CollectionAlbumCreate, CollectionAlbumUpdate

from tests.integration.conftest import make_real_test_user as make_test_user


def make_collection_service(session: AsyncSession) -> CollectionService:
    return CollectionService(
        repository=CollectionRepository(session),
        like_repository=LikeRepository(session),
        collection_album_repository=CollectionAlbumRepository(session),
        wishlist_repository=WishlistRepository(session),
    )


def make_external_reference_service(session: AsyncSession) -> ExternalReferenceService:
    repo = ExternalReferenceRepository(
        db=session,
        wishlist_repo=WishlistRepository(session),
        collection_repo=CollectionRepository(session),
        album_repo=AlbumRepository(session),
        artist_repo=ArtistRepository(session),
    )
    return ExternalReferenceService(repo)


async def make_test_collection(session: AsyncSession, owner_id: int) -> Collection:
    collection = Collection(
        name=f"itest collection {uuid.uuid4().hex[:8]}",
        description=None,
        is_public=True,
        owner_id=owner_id,
        mood_id=None,
    )
    session.add(collection)
    await session.flush()
    return collection


async def pick_existing_album_id(session: AsyncSession) -> int:
    return (await session.execute(select(Album.id).limit(1))).scalar_one()


class TestGetCollectionByIdRealData:
    async def test_existing_collection_with_albums_and_artists_loads_without_crashing(self, real_session):
        """Regression test for the whole lazy="raise" migration: finds a real
        collection that already has both albums and artists, and confirms
        CollectionService.get_collection_by_id builds a full response without
        InvalidRequestError/MissingGreenlet on any relation."""
        candidate_id = (
            await real_session.execute(
                select(Collection.id)
                .join(CollectionAlbum, CollectionAlbum.collection_id == Collection.id)
                .join(CollectionArtist, CollectionArtist.collection_id == Collection.id)
                .group_by(Collection.id)
                .having(func.count(func.distinct(CollectionAlbum.album_id)) > 0)
                .having(func.count(func.distinct(CollectionArtist.artist_id)) > 0)
                .limit(1)
            )
        ).scalar_one_or_none()

        if candidate_id is None:
            pytest.skip("No collection with both non-empty albums and artists found in this dataset")

        collection_row = (
            await real_session.execute(select(Collection).filter(Collection.id == candidate_id))
        ).scalar_one()

        service = make_collection_service(real_session)
        response = await service.get_collection_by_id(collection_id=candidate_id, user_id=collection_row.owner_id)

        assert response.id == candidate_id
        assert len(response.albums) > 0
        assert len(response.artists) > 0
        # exercises collection_artist.artist and album.external_source specifically
        assert response.artists[0].external_source is not None
        assert response.albums[0].external_source is not None


class TestAddAlbumToCollectionRealData:
    async def test_add_existing_album_to_fresh_collection(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)

        service = make_collection_service(real_session)
        response = await service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=CollectionAlbumCreate(
                album_id=album_id, collection_id=collection.id, state_record="mint"
            ),
        )

        assert response.id == album_id
        assert response.state_record is not None
        assert response.external_source is not None


class TestUpdateAlbumMetadataRealData:
    async def test_update_metadata_of_album_in_collection(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)

        service = make_collection_service(real_session)
        await service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=CollectionAlbumCreate(album_id=album_id, collection_id=collection.id),
        )

        response = await service.update_album_metadata(
            user_id=user.id,
            collection_id=collection.id,
            album_id=album_id,
            metadata=CollectionAlbumUpdate(state_record="good", acquisition_month_year="2024-06"),
        )

        assert response.state_record is not None
        assert response.acquisition_month_year == "2024-06"
        assert response.external_source is not None


class TestRemoveFromCollectionRealData:
    async def test_remove_album_from_collection(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album_id = await pick_existing_album_id(real_session)
        external_album_id = (
            await real_session.execute(select(Album.external_album_id).filter(Album.id == album_id))
        ).scalar_one()

        collection_service = make_collection_service(real_session)
        await collection_service.add_album_to_collection(
            user_id=user.id,
            collection_id=collection.id,
            album_data=CollectionAlbumCreate(album_id=album_id, collection_id=collection.id),
        )

        from app.core.enums import EntityTypeEnum

        ext_service = make_external_reference_service(real_session)
        result = await ext_service.remove_from_collection(
            user_id=user.id,
            collection_id=collection.id,
            external_id=external_album_id,
            entity_type=EntityTypeEnum.ALBUM,
        )

        assert result is True

        remaining = (
            await real_session.execute(
                select(CollectionAlbum).filter(
                    CollectionAlbum.collection_id == collection.id,
                    CollectionAlbum.album_id == album_id,
                )
            )
        ).scalar_one_or_none()
        assert remaining is None
