"""
Two requests adding the same Discogs release or artist at once (a double click): both succeed,
one row is created.

A plain INSERT made the loser fail at flush on the unique constraint; the session then needed a
rollback, so the fallback lookup failed too and the user got a 500. The creation is now an
INSERT ... ON CONFLICT DO NOTHING followed by a lookup.

Same safety model as the other *_real_db tests: every write is rolled back at the end.
"""
import asyncio
import random
from contextlib import contextmanager
from unittest.mock import patch

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.enums import EntityTypeEnum
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.schemas.album_schema import AlbumCreate
from app.schemas.external_reference_schema import AddToCollectionRequest, AddToWishlistRequest
from app.services.wishlist_service import WishlistService

from tests.integration.conftest import make_real_test_user
from tests.integration.test_real_db_relationships import make_external_reference_service, make_test_collection


def fresh_external_id() -> str:
    # 12 digits: far beyond the real Discogs ids, so never one of the copy of production
    return str(random.randint(10**11, 10**12 - 1))


def make_repository(session: AsyncSession) -> ExternalReferenceRepository:
    return ExternalReferenceRepository(
        db=session,
        wishlist_repo=WishlistRepository(session),
        collection_repo=CollectionRepository(session),
        album_repo=AlbumRepository(session),
        artist_repo=ArtistRepository(session),
    )


def make_wishlist_service(session: AsyncSession) -> WishlistService:
    return WishlistService(wishlist_repo=WishlistRepository(session), external_ref_repo=make_repository(session))


def collection_request(external_id: str, entity_type: EntityTypeEnum = EntityTypeEnum.ALBUM):
    return AddToCollectionRequest(
        external_id=external_id, entity_type=entity_type, title="Race Test - Record",
        image_url="https://i.discogs.com/cover.jpg", source="discogs",
    )


def wishlist_request(external_id: str, entity_type: EntityTypeEnum = EntityTypeEnum.ALBUM):
    return AddToWishlistRequest(
        external_id=external_id, entity_type=entity_type, title="Race Test - Record",
        image_url="https://i.discogs.com/cover.jpg", source="discogs",
    )


@contextmanager
def lookup_misses_once(method_name: str):
    """
    The lookup before the creation misses the row once: what happens when two requests both pass
    the "not there yet" check before either writes. The row exists, so the creation conflicts.
    """
    real_lookup = getattr(ExternalReferenceRepository, method_name)
    calls = {"count": 0}

    async def miss_once(self, *args, **kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            return None
        return await real_lookup(self, *args, **kwargs)

    with patch.object(ExternalReferenceRepository, method_name, miss_once):
        yield


async def count_albums(session: AsyncSession, external_id: str) -> int:
    return (await session.execute(
        select(func.count(Album.id)).where(Album.external_album_id == external_id)
    )).scalar_one()


async def count_artists(session: AsyncSession, external_id: str) -> int:
    return (await session.execute(
        select(func.count(Artist.id)).where(Artist.external_artist_id == external_id)
    )).scalar_one()


class TestDoubleAddToCollection:
    async def test_same_album_twice_both_succeed_one_row(self, real_session):
        user = await make_real_test_user(real_session)
        collection = await make_test_collection(real_session, user.id)
        service = make_external_reference_service(real_session)
        external_id = fresh_external_id()

        first = await service.add_to_collection(user.id, collection.id, collection_request(external_id))
        with lookup_misses_once("find_album_by_external_id"):
            second = await service.add_to_collection(user.id, collection.id, collection_request(external_id))

        assert first.item.external_id == second.item.external_id == external_id
        assert await count_albums(real_session, external_id) == 1

    async def test_same_artist_twice_both_succeed_one_row(self, real_session):
        user = await make_real_test_user(real_session)
        collection = await make_test_collection(real_session, user.id)
        service = make_external_reference_service(real_session)
        external_id = fresh_external_id()
        request = collection_request(external_id, EntityTypeEnum.ARTIST)

        first = await service.add_to_collection(user.id, collection.id, request)
        with lookup_misses_once("find_artist_by_external_id"):
            second = await service.add_to_collection(user.id, collection.id, request)

        assert first.is_new is True
        assert second.is_new is False
        assert await count_artists(real_session, external_id) == 1


class TestDoubleAddToWishlist:
    async def test_same_album_by_two_users_both_succeed_one_row(self, real_session):
        # Another user: the wishlist pre-check does not stop the second request before the album
        first_user = await make_real_test_user(real_session)
        second_user = await make_real_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_external_id()

        await service.add_to_wishlist(first_user.id, wishlist_request(external_id))
        with lookup_misses_once("find_album_by_external_id"):
            second = await service.add_to_wishlist(second_user.id, wishlist_request(external_id))

        assert second.is_new is True
        assert await count_albums(real_session, external_id) == 1

    async def test_same_artist_by_two_users_both_succeed_one_row(self, real_session):
        first_user = await make_real_test_user(real_session)
        second_user = await make_real_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_external_id()
        request = wishlist_request(external_id, EntityTypeEnum.ARTIST)

        await service.add_to_wishlist(first_user.id, request)
        with lookup_misses_once("find_artist_by_external_id"):
            await service.add_to_wishlist(second_user.id, request)

        assert await count_artists(real_session, external_id) == 1


class TestMoveWishlistItem:
    @pytest.mark.parametrize("entity_type, lookup, count", [
        (EntityTypeEnum.ALBUM, "find_album_by_external_id", count_albums),
        (EntityTypeEnum.ARTIST, "find_artist_by_external_id", count_artists),
    ])
    async def test_move_while_the_row_appears_succeeds(self, real_session, entity_type, lookup, count):
        user = await make_real_test_user(real_session)
        collection = await make_test_collection(real_session, user.id)
        external_id = fresh_external_id()
        added = await make_wishlist_service(real_session).add_to_wishlist(
            user.id, wishlist_request(external_id, entity_type))

        with lookup_misses_once(lookup):
            moved = await make_external_reference_service(real_session).move_wishlist_item_to_collection(
                user.id, added.item.id, collection.id)

        assert moved.collection_id == collection.id
        assert await count(real_session, external_id) == 1


class TestTwoConnections:
    async def test_second_insert_waits_for_the_first_then_succeeds(self, real_engine):
        """
        Two real connections. The second one waits on the unique index while the first holds the
        uncommitted row, instead of failing; once the first is rolled back, the second creates it.
        (The first cannot commit here: nothing may stay in this copy of production.)
        """
        external_id = fresh_external_id()
        async with real_engine.connect() as conn_a, real_engine.connect() as conn_b:
            await conn_a.begin()
            await conn_b.begin()
            factory_a = async_sessionmaker(bind=conn_a, expire_on_commit=False)
            factory_b = async_sessionmaker(bind=conn_b, expire_on_commit=False)
            session_a, session_b = factory_a(), factory_b()
            try:
                repo_a, repo_b = make_repository(session_a), make_repository(session_b)
                source_id = await repo_a.get_external_source_id("discogs")
                data = AlbumCreate(external_album_id=external_id, title="Race Test - Record",
                                   image_url="", external_source_id=source_id)

                album_a, created_a = await repo_a.get_or_create_album(data)
                assert created_a is True

                second = asyncio.create_task(repo_b.get_or_create_album(data))
                await asyncio.sleep(0.5)
                assert not second.done(), "the second insert must wait for the first transaction"

                await session_a.close()
                await conn_a.rollback()
                album_b, created_b = await asyncio.wait_for(second, timeout=10)

                assert created_b is True
                assert album_b.external_album_id == external_id
                assert album_b.external_source is not None
                assert await count_albums(session_b, external_id) == 1
            finally:
                await session_a.close()
                await session_b.close()
                await conn_b.rollback()
