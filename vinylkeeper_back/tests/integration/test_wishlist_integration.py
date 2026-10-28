"""
Real-database integration tests for the Wishlist domain.

Same safety model as test_real_db_relationships.py: real_session (from
tests/integration/conftest.py) runs every test inside an outer transaction +
SAVEPOINT that is rolled back at the end, so nothing is ever permanently
written to this copy-of-production database.
"""
import random
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository

from app.services.wishlist_service import WishlistService

from app.schemas.external_reference_schema import AddToWishlistRequest
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ResourceNotFoundError

from tests.integration.conftest import make_real_test_user as make_test_user


def make_wishlist_service(session: AsyncSession) -> WishlistService:
    external_ref_repo = ExternalReferenceRepository(
        db=session,
        wishlist_repo=WishlistRepository(session),
        collection_repo=CollectionRepository(session),
        album_repo=AlbumRepository(session),
        artist_repo=ArtistRepository(session),
    )
    return WishlistService(
        wishlist_repo=WishlistRepository(session),
        external_ref_repo=external_ref_repo,
    )


def fresh_numeric_external_id() -> str:
    """A very-unlikely-to-collide numeric external ID (Album/Artist require
    a purely digit external_album_id/external_artist_id, and this DB is a
    real copy of prod so we must not reuse an existing one)."""
    return str(random.randint(10**15, 10**16 - 1))


class TestAddToWishlist:
    async def test_add_new_album_creates_album_and_wishlist_entry(self, real_session):
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_numeric_external_id()

        response = await service.add_to_wishlist(
            user_id=user.id,
            request=AddToWishlistRequest(
                external_id=external_id,
                entity_type=EntityTypeEnum.ALBUM,
                title="Integration Test Album",
                image_url="https://i.discogs.com/cover.jpg",
                source="discogs",
            ),
        )

        assert response.is_new is True
        assert response.item.external_id == external_id
        assert response.item.entity_type == "album"

        from app.models.album_model import Album
        created = (
            await real_session.execute(
                select(Album).filter(Album.external_album_id == external_id)
            )
        ).scalar_one_or_none()
        assert created is not None
        assert created.title == "Integration Test Album"

    async def test_add_new_artist_creates_artist_and_wishlist_entry(self, real_session):
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_numeric_external_id()

        response = await service.add_to_wishlist(
            user_id=user.id,
            request=AddToWishlistRequest(
                external_id=external_id,
                entity_type=EntityTypeEnum.ARTIST,
                title="Integration Test Artist",
                image_url="https://i.discogs.com/artist.jpg",
                source="musicbrainz",
            ),
        )

        assert response.is_new is True
        assert response.item.entity_type == "artist"

    async def test_add_same_item_twice_returns_is_new_false_second_time(self, real_session):
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_numeric_external_id()
        request = AddToWishlistRequest(
            external_id=external_id,
            entity_type=EntityTypeEnum.ALBUM,
            title="Duplicate Test Album",
            image_url="https://i.discogs.com/cover.jpg",
            source="discogs",
        )

        first = await service.add_to_wishlist(user_id=user.id, request=request)
        second = await service.add_to_wishlist(user_id=user.id, request=request)

        assert first.is_new is True
        assert second.is_new is False
        assert first.item.id == second.item.id


class TestConcurrentWishlistInsert:
    async def test_concurrent_insert_returns_existing_not_server_error(self, real_session):
        """Regression test: simulates the TOCTOU race where two requests both
        pass the "not in wishlist yet" pre-check before either commits. The
        item already exists (as if the other request won the race), but
        WishlistRepository.find_by_user_and_external_id is patched to miss it
        on its first call only, forcing a real unique-constraint violation
        (uq_wishlist_user_entity_source) on insert. Before the fix, this
        surfaced as a generic ServerError (500) because the repository's
        blanket `except SQLAlchemyError` swallowed IntegrityError; now the
        service catches it and returns the existing item idempotently,
        matching the pre-check branch's own is_new=False behavior."""
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_numeric_external_id()
        request = AddToWishlistRequest(
            external_id=external_id,
            entity_type=EntityTypeEnum.ALBUM,
            title="Race Test Album",
            image_url="https://i.discogs.com/cover.jpg",
            source="discogs",
        )

        first = await service.add_to_wishlist(user_id=user.id, request=request)
        assert first.is_new is True

        real_find = WishlistRepository.find_by_user_and_external_id
        calls = {"n": 0}

        async def miss_once_then_real(self, *args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                return None
            return await real_find(self, *args, **kwargs)

        with patch.object(WishlistRepository, "find_by_user_and_external_id", miss_once_then_real):
            second = await service.add_to_wishlist(user_id=user.id, request=request)

        assert second.is_new is False
        assert second.item.id == first.item.id


class TestRemoveFromWishlist:
    async def test_remove_own_item_succeeds(self, real_session):
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        external_id = fresh_numeric_external_id()
        added = await service.add_to_wishlist(
            user_id=user.id,
            request=AddToWishlistRequest(
                external_id=external_id,
                entity_type=EntityTypeEnum.ALBUM,
                title="To Remove",
                image_url="https://i.discogs.com/cover.jpg",
                source="discogs",
            ),
        )

        result = await service.remove_from_wishlist(user_id=user.id, wishlist_id=added.item.id)
        assert result is True

        remaining = await WishlistRepository(real_session).get_by_id(added.item.id)
        assert remaining is None

    async def test_remove_another_users_item_raises_not_found(self, real_session):
        owner = await make_test_user(real_session)
        intruder = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        added = await service.add_to_wishlist(
            user_id=owner.id,
            request=AddToWishlistRequest(
                external_id=fresh_numeric_external_id(),
                entity_type=EntityTypeEnum.ALBUM,
                title="Not Yours",
                image_url="https://i.discogs.com/cover.jpg",
                source="discogs",
            ),
        )

        with pytest.raises(ResourceNotFoundError):
            await service.remove_from_wishlist(user_id=intruder.id, wishlist_id=added.item.id)


class TestGetUserWishlistPaginated:
    async def test_paginated_list_reflects_added_items(self, real_session):
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        for _ in range(3):
            await service.add_to_wishlist(
                user_id=user.id,
                request=AddToWishlistRequest(
                    external_id=fresh_numeric_external_id(),
                    entity_type=EntityTypeEnum.ALBUM,
                    title="Paginated Item",
                    image_url="https://i.discogs.com/cover.jpg",
                    source="discogs",
                ),
            )

        page = await service.get_user_wishlist_paginated(user_id=user.id, page=1, limit=8)

        assert page.total == 3
        assert len(page.items) == 3


class TestGetWishlistItemDetail:
    async def test_detail_loads_entity_type_and_external_source(self, real_session):
        user = await make_test_user(real_session)
        service = make_wishlist_service(real_session)
        added = await service.add_to_wishlist(
            user_id=user.id,
            request=AddToWishlistRequest(
                external_id=fresh_numeric_external_id(),
                entity_type=EntityTypeEnum.ARTIST,
                title="Detail Test Artist",
                image_url="https://i.discogs.com/artist.jpg",
                source="musicbrainz",
            ),
        )

        detail = await service.get_wishlist_item_detail(added.item.id)

        assert detail.entity_type == "artist"
        assert detail.source == "musicbrainz"
