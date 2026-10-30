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
from app.models.reference_data.entity_types import EntityType
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


class TestWishlistByWork:
    """The wishlist shows one card per work, as the collections do."""

    async def test_the_pressings_of_a_work_are_one_card_and_an_artist_stays_apart(self, real_session):
        from datetime import datetime, timedelta, timezone
        from app.models.album_model import Album
        from app.models.wishlist_model import Wishlist
        from app.repositories.discogs_import_repository import DiscogsImportRepository

        user = await make_test_user(real_session)
        imports = DiscogsImportRepository(real_session)
        source_id = await imports.discogs_source_id()
        album_type = await imports.album_entity_type_id()
        artist_type = (await real_session.execute(
            select(EntityType.id).where(EntityType.name == EntityTypeEnum.ARTIST.value))).scalar_one()

        base = random.randint(3_000_000_000, 3_900_000_000)
        original, reissue, other = str(base), str(base + 1), str(base + 2)
        master = f"itest-master-{base}"
        real_session.add_all([
            Album(external_album_id=original, external_source_id=source_id, title="Kind Of Blue",
                  external_master_id=master, release_year=1959, label="Columbia", formats=["LP", "Mono"]),
            Album(external_album_id=reissue, external_source_id=source_id, title="Kind Of Blue",
                  external_master_id=master, release_year=2015, label="Sony", formats=["LP"]),
            Album(external_album_id=other, external_source_id=source_id, title="Blue Train"),
        ])
        now = datetime.now(timezone.utc)
        for minutes, external_id, entity_type, title in [
            (4, original, album_type, "Kind Of Blue"),
            (3, other, album_type, "Blue Train"),
            (2, reissue, album_type, "Kind Of Blue"),
            # Same number as a release id: an artist is never joined to that album
            (1, original, artist_type, "Miles Davis"),
        ]:
            real_session.add(Wishlist(user_id=user.id, external_id=external_id, entity_type_id=entity_type,
                                      external_source_id=source_id, title=title,
                                      created_at=now - timedelta(minutes=minutes)))
        await real_session.flush()

        page = await make_wishlist_service(real_session).get_user_wishlist_paginated(user_id=user.id, page=1, limit=8)

        assert page.total == 3
        # Newest first, a work by its last added pressing
        assert [(card.title, card.entity_type, card.pressings_count) for card in page.items] == [
            ("Miles Davis", "artist", 1), ("Kind Of Blue", "album", 2), ("Blue Train", "album", 1)]
        kind_of_blue = page.items[1]
        assert [(p.external_id, p.release_year, p.label) for p in kind_of_blue.pressings] == [
            (original, 1959, "Columbia"), (reissue, 2015, "Sony")]

        oldest_first = await make_wishlist_service(real_session).get_user_wishlist_paginated(
            user_id=user.id, page=1, limit=8, sort_order="oldest")
        assert [card.title for card in oldest_first.items] == ["Kind Of Blue", "Blue Train", "Miles Davis"]


class TestMoveToCollection:
    """« Got it »: a wanted record into a collection, out of the wishlist, in one transaction."""

    async def wanted(self, real_session, user, entity=EntityTypeEnum.ALBUM):
        from app.models.album_model import Album
        from app.models.wishlist_model import Wishlist
        from app.repositories.discogs_import_repository import DiscogsImportRepository

        imports = DiscogsImportRepository(real_session)
        source_id = await imports.discogs_source_id()
        type_id = (await real_session.execute(
            select(EntityType.id).where(EntityType.name == entity.value))).scalar_one()
        external_id = str(random.randint(3_000_000_000, 3_900_000_000))
        if entity == EntityTypeEnum.ALBUM:
            real_session.add(Album(external_album_id=external_id, external_source_id=source_id, title="Wanted LP"))
        item = Wishlist(user_id=user.id, external_id=external_id, entity_type_id=type_id,
                        external_source_id=source_id, title="Wanted LP")
        real_session.add(item)
        await real_session.flush()
        return item

    async def copies(self, real_session, collection_id):
        from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
        rows = (await real_session.execute(
            select(CollectionAlbum.pressing_confirmed, CollectionAlbumCopy.id)
            .join(CollectionAlbumCopy, (CollectionAlbumCopy.collection_id == CollectionAlbum.collection_id)
                  & (CollectionAlbumCopy.album_id == CollectionAlbum.album_id))
            .where(CollectionAlbum.collection_id == collection_id))).all()
        return rows

    async def test_the_record_moves_with_its_pressing_confirmed(self, real_session):
        from app.models.wishlist_model import Wishlist
        from tests.integration.test_real_db_relationships import make_external_reference_service, make_test_collection

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        item = await self.wanted(real_session, user)
        item_id = item.id

        result = await make_external_reference_service(real_session).move_wishlist_item_to_collection(
            user.id, item_id, collection.id)

        assert result.already_in_collection is False and result.collection_id == collection.id
        copies = await self.copies(real_session, collection.id)
        assert len(copies) == 1 and copies[0].pressing_confirmed is True
        assert (await real_session.execute(select(Wishlist).where(Wishlist.id == item_id))).first() is None

    async def test_already_in_the_collection_gives_one_more_copy(self, real_session):
        from tests.integration.test_real_db_relationships import make_external_reference_service, make_test_collection

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        service = make_external_reference_service(real_session)
        first = await self.wanted(real_session, user)
        await service.move_wishlist_item_to_collection(user.id, first.id, collection.id)
        again = await self.wanted(real_session, user)
        again.external_id = first.external_id
        await real_session.flush()

        result = await service.move_wishlist_item_to_collection(user.id, again.id, collection.id)

        assert result.already_in_collection is True
        assert len(await self.copies(real_session, collection.id)) == 2

    async def test_only_the_owner_moves_into_their_own_collection(self, real_session):
        from app.core.exceptions import ForbiddenError
        from tests.integration.test_real_db_relationships import make_external_reference_service, make_test_collection

        owner, stranger = await make_test_user(real_session), await make_test_user(real_session)
        theirs = await make_test_collection(real_session, owner_id=stranger.id)
        mine = await make_test_collection(real_session, owner_id=owner.id)
        item = await self.wanted(real_session, owner)
        service = make_external_reference_service(real_session)

        with pytest.raises(ResourceNotFoundError):
            await service.move_wishlist_item_to_collection(stranger.id, item.id, theirs.id)
        with pytest.raises(ForbiddenError):
            await service.move_wishlist_item_to_collection(owner.id, item.id, theirs.id)
        moved = await service.move_wishlist_item_to_collection(owner.id, item.id, mine.id)
        assert moved.already_in_collection is False

    async def test_an_artist_goes_to_the_artists_of_the_collection_once(self, real_session):
        from app.models.association_tables import CollectionArtist
        from app.models.wishlist_model import Wishlist
        from tests.integration.test_real_db_relationships import make_external_reference_service, make_test_collection

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        service = make_external_reference_service(real_session)
        artist = await self.wanted(real_session, user, EntityTypeEnum.ARTIST)
        external_id, artist_wish_id = artist.external_id, artist.id

        result = await service.move_wishlist_item_to_collection(user.id, artist_wish_id, collection.id)

        assert (result.entity_type, result.already_in_collection) == ("artist", False)
        assert (await real_session.execute(select(Wishlist).where(Wishlist.id == artist_wish_id))).first() is None
        count = lambda: real_session.execute(  # noqa: E731
            select(CollectionArtist).where(CollectionArtist.collection_id == collection.id))
        assert len((await count()).all()) == 1

        again = await self.wanted(real_session, user, EntityTypeEnum.ARTIST)
        again.external_id = external_id
        await real_session.flush()
        result = await service.move_wishlist_item_to_collection(user.id, again.id, collection.id)

        assert result.already_in_collection is True and "already" in result.message
        assert len((await count()).all()) == 1


class TestMoveWithAPressingToConfirm:
    async def test_a_pressing_not_sure_stays_to_confirm_in_the_collection(self, real_session):
        from tests.integration.test_real_db_relationships import make_external_reference_service, make_test_collection

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        item = await TestMoveToCollection().wanted(real_session, user)

        await make_external_reference_service(real_session).move_wishlist_item_to_collection(
            user.id, item.id, collection.id, pressing_confirmed=False)

        [row] = await TestMoveToCollection().copies(real_session, collection.id)
        assert row.pressing_confirmed is False
