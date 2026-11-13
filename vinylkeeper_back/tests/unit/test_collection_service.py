import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.collection_service import CollectionService, shared_visible_items
from app.schemas.collection_schema import CollectionCreate, CollectionUpdate
from app.core.exceptions import (
    DuplicateCollectionNameError,
    ForbiddenError,
    ResourceNotFoundError,
    ValidationError,
)
from app.models.collection_model import Collection
from app.models.association_tables import CollectionArtist
from app.models.artist_model import Artist
from app.models.collection_album import CollectionAlbum
from app.models.album_model import Album
from app.models.reference_data.external_sources import ExternalSource


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_db():
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


def make_collection(
    collection_id: int = 1,
    owner_id: int = 1,
    is_public: bool = True,
    name: str = "My Collection",
) -> MagicMock:
    col = MagicMock()
    col.id = collection_id
    col.owner_id = owner_id
    col.is_public = is_public
    col.name = name
    col.description = None
    col.mood_id = None
    col.collection_albums = []
    col.collection_artists = []
    col.share_token = "0123456789abcdef0123456789abcdef"
    col.owner = None
    col.created_at = datetime.now(timezone.utc)
    col.updated_at = datetime.now(timezone.utc)
    return col


def make_service():
    repo = AsyncMock()
    repo.db = make_db()
    repo.saves_of = AsyncMock(return_value={})

    like_repo = AsyncMock()
    like_repo.count_likes = AsyncMock(return_value=0)
    like_repo.is_liked_by_user = AsyncMock(return_value=False)

    album_repo = AsyncMock()
    album_repo.db = make_db()

    wishlist_repo = AsyncMock()

    service = CollectionService(repo, like_repo, album_repo, wishlist_repo)
    return service, repo, like_repo, album_repo


# ---------------------------------------------------------------------------
# _get_owned_collection (testé via les méthodes publiques)
# ---------------------------------------------------------------------------

class TestGetOwnedCollection:
    async def test_not_found_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.delete_collection(user_id=1, collection_id=99)

    async def test_not_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2))

        with pytest.raises(ForbiddenError):
            await service.delete_collection(user_id=1, collection_id=1)

    async def test_owner_succeeds(self):
        service, repo, *_ = make_service()
        collection = make_collection(owner_id=1)
        repo.get_by_id = AsyncMock(return_value=collection)
        repo.delete = AsyncMock()

        result = await service.delete_collection(user_id=1, collection_id=1)
        assert result is True

    async def test_writes_check_the_owner_without_loading_every_album(self):
        """Loading all albums and copies of a large collection on each write made writes slow."""
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=1))

        await service.remove_album_from_collection(user_id=1, collection_id=1, album_id=5)

        assert repo.get_by_id.await_args.kwargs["load_relations"] is False

    async def test_delete_loads_relations_for_the_cascade(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=1))
        repo.delete = AsyncMock()

        await service.delete_collection(user_id=1, collection_id=1)

        assert repo.get_by_id.await_args.kwargs["load_relations"] is True


# ---------------------------------------------------------------------------
# _assert_collection_accessible
# ---------------------------------------------------------------------------

class TestAssertCollectionAccessible:
    def test_public_collection_any_user(self):
        service, *_ = make_service()
        col = make_collection(owner_id=1, is_public=True)
        service._assert_collection_accessible(col, user_id=99)  # pas d'exception

    def test_private_collection_owner(self):
        service, *_ = make_service()
        col = make_collection(owner_id=1, is_public=False)
        service._assert_collection_accessible(col, user_id=1)  # pas d'exception

    def test_private_collection_non_owner_raises(self):
        service, *_ = make_service()
        col = make_collection(owner_id=1, is_public=False)
        with pytest.raises(ForbiddenError):
            service._assert_collection_accessible(col, user_id=99)


# ---------------------------------------------------------------------------
# create_collection
# ---------------------------------------------------------------------------

class TestCreateCollection:
    async def test_duplicate_name_raises(self):
        service, repo, *_ = make_service()
        repo.find_by_name_and_owner = AsyncMock(return_value=make_collection())

        with pytest.raises(DuplicateCollectionNameError):
            await service.create_collection(
                CollectionCreate.model_construct(
                    name="Dup", description=None, is_public=False,
                    mood_id=None, album_ids=[], artist_ids=[]
                ),
                user_id=1,
            )

    async def test_success_calls_repo_create(self):
        service, repo, like_repo, *_ = make_service()
        created = make_collection()
        repo.find_by_name_and_owner = AsyncMock(return_value=None)
        repo.create = AsyncMock(return_value=created)
        repo.refresh = AsyncMock(return_value=created)
        repo.get_by_id = AsyncMock(return_value=created)

        with patch.object(service, "_build_collection_response", new_callable=AsyncMock) as mock_build:
            mock_build.return_value = MagicMock()
            await service.create_collection(
                CollectionCreate.model_construct(
                    name="New", description=None, is_public=False,
                    mood_id=None, album_ids=[], artist_ids=[]
                ),
                user_id=1,
            )

        repo.create.assert_awaited_once()

    async def test_success_with_album_ids_calls_add_albums(self):
        service, repo, *_ = make_service()
        created = make_collection()
        repo.find_by_name_and_owner = AsyncMock(return_value=None)
        repo.create = AsyncMock(return_value=created)
        repo.refresh = AsyncMock(return_value=created)
        repo.get_by_id = AsyncMock(return_value=created)
        repo.add_albums = AsyncMock()

        with patch.object(service, "_build_collection_response", new_callable=AsyncMock, return_value=MagicMock()):
            await service.create_collection(
                CollectionCreate.model_construct(
                    name="New", description=None, is_public=False,
                    mood_id=None, album_ids=[1, 2], artist_ids=[]
                ),
                user_id=1,
            )

        repo.add_albums.assert_awaited_once_with(created, [1, 2])


# ---------------------------------------------------------------------------
# like_collection / unlike_collection
# ---------------------------------------------------------------------------

class TestLikeCollection:
    async def test_collection_not_found_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.like_collection(user_id=1, collection_id=99)

    async def test_already_liked_raises(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection())
        like_repo.is_liked_by_user = AsyncMock(return_value=True)

        from app.core.exceptions import DuplicateFieldError
        with pytest.raises(DuplicateFieldError):
            await service.like_collection(user_id=1, collection_id=1)

    async def test_success_returns_dict(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection())
        like_repo.is_liked_by_user = AsyncMock(return_value=False)
        like_repo.create_like = AsyncMock()
        like_repo.count_likes = AsyncMock(return_value=5)

        result = await service.like_collection(user_id=1, collection_id=1)

        assert result["is_liked"] is True
        assert result["likes_count"] == 5

    async def test_private_collection_of_someone_else_raises(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2, is_public=False))
        like_repo.create_like = AsyncMock()

        with pytest.raises(ForbiddenError):
            await service.like_collection(user_id=1, collection_id=1)
        like_repo.create_like.assert_not_called()

    async def test_owner_can_like_own_private_collection(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=1, is_public=False))
        like_repo.is_liked_by_user = AsyncMock(return_value=False)
        like_repo.create_like = AsyncMock()
        like_repo.count_likes = AsyncMock(return_value=1)

        result = await service.like_collection(user_id=1, collection_id=1)

        assert result["is_liked"] is True


class TestUnlikeCollection:
    async def test_private_collection_of_someone_else_raises(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2, is_public=False))
        like_repo.remove = AsyncMock()

        with pytest.raises(ForbiddenError):
            await service.unlike_collection(user_id=1, collection_id=1)
        like_repo.remove.assert_not_called()

    async def test_collection_not_found_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.unlike_collection(user_id=1, collection_id=99)

    async def test_not_liked_raises(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection())
        like_repo.is_liked_by_user = AsyncMock(return_value=False)

        with pytest.raises(ResourceNotFoundError):
            await service.unlike_collection(user_id=1, collection_id=1)

    async def test_success_returns_dict(self):
        service, repo, like_repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection())
        like_repo.is_liked_by_user = AsyncMock(return_value=True)
        like_repo.remove = AsyncMock()
        like_repo.count_likes = AsyncMock(return_value=3)

        result = await service.unlike_collection(user_id=1, collection_id=1)

        assert result["is_liked"] is False
        assert result["likes_count"] == 3


# ---------------------------------------------------------------------------
# get_collection_by_id
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# _build_collection_response — real (non-mocked) ORM relationship objects
#
# Regression test for the CollectionArtist.artist eager-load bug: every other
# test in this file uses col.collection_artists = [] on a MagicMock, which
# never exercises the `collection_artist.artist` attribute access in
# collection_service._build_collection_response. Real ORM instances are used
# here instead so that a real (non-Mock) relationship is actually read.
#
# Note: this does NOT reproduce the MissingGreenlet failure mode itself
# (these objects are transient, never attached to a session, so unset
# relationships just default to None/[] instead of triggering a lazy load).
# That requires a real AsyncSession round-trip — see the Phase B integration
# tests for that coverage.
# ---------------------------------------------------------------------------

class TestBuildCollectionResponseRealObjects:
    async def test_artists_and_albums_are_mapped_from_real_relations(self):
        service, *_ = make_service()

        now = datetime.now(timezone.utc)
        collection = Collection(
            id=1, name="Real Collection", description=None,
            is_public=True, owner_id=1, mood_id=None,
            created_at=now, updated_at=now,
        )
        collection.owner = None

        source = ExternalSource(id=1, name="musicbrainz")

        artist = Artist(
            id=10, external_artist_id="123", external_source_id=1,
            title="Real Artist", image_url=None,
            created_at=now, updated_at=now,
        )
        artist.external_source = source

        collection_artist = CollectionArtist(
            collection_id=1, artist_id=10, created_at=now, updated_at=now,
        )
        collection_artist.artist = artist
        collection.collection_artists = [collection_artist]

        album = Album(
            id=20, external_album_id="456", external_source_id=1,
            title="Real Album", image_url=None,
            created_at=now, updated_at=now,
        )
        album.external_source = source

        collection_album = CollectionAlbum(
            collection_id=1, album_id=20, created_at=now, updated_at=now,
        )
        collection_album.album = album
        collection.collection_albums = [collection_album]

        response = await service._build_collection_response(
            collection, user_id=1, likes_count=0, is_liked=False
        )

        assert len(response.artists) == 1
        assert response.artists[0].id == 10
        assert response.artists[0].external_source["name"] == "musicbrainz"

        assert len(response.albums) == 1
        assert response.albums[0].id == 20
        assert response.albums[0].external_source["name"] == "musicbrainz"


# ---------------------------------------------------------------------------
# update_collection
# ---------------------------------------------------------------------------

class TestUpdateCollection:
    async def test_not_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2))

        with pytest.raises(ForbiddenError):
            await service.update_collection(
                user_id=1, collection_id=1,
                collection_data=CollectionUpdate.model_construct(
                    name="New name", description=None, is_public=None, mood_id=None
                ),
            )

    async def test_duplicate_name_raises(self):
        service, repo, *_ = make_service()
        existing = make_collection(collection_id=1, owner_id=1, name="Old name")
        duplicate = make_collection(collection_id=2, owner_id=1, name="Taken")
        repo.get_by_id = AsyncMock(return_value=existing)
        repo.find_by_name_and_owner = AsyncMock(return_value=duplicate)

        with pytest.raises(DuplicateCollectionNameError):
            await service.update_collection(
                user_id=1, collection_id=1,
                collection_data=CollectionUpdate.model_construct(
                    name="Taken", description=None, is_public=None, mood_id=None
                ),
            )

    async def test_same_name_skips_uniqueness_check(self):
        service, repo, *_ = make_service()
        col = make_collection(owner_id=1, name="Same name")
        repo.get_by_id = AsyncMock(return_value=col)
        repo.update = AsyncMock(return_value=col)

        await service.update_collection(
            user_id=1, collection_id=1,
            collection_data=CollectionUpdate.model_construct(
                name="Same name", description=None, is_public=None, mood_id=None
            ),
        )

        repo.find_by_name_and_owner.assert_not_awaited()

    async def test_saves_the_fields_without_reloading_the_collection(self):
        """The endpoints answer a message only: no album nor copy is loaded for a response."""
        service, repo, *_ = make_service()
        col = make_collection(owner_id=1, name="Jazz")
        repo.get_by_id = AsyncMock(return_value=col)
        repo.update = AsyncMock(return_value=col)

        result = await service.update_collection(
            user_id=1, collection_id=1, collection_data=CollectionUpdate(description="Blue Note"),
        )

        assert result is None
        assert col.description == "Blue Note"
        repo.update.assert_awaited_once_with(col)
        # One read, without the albums nor their copies
        repo.get_by_id.assert_awaited_once_with(1, load_relations=False)


# ---------------------------------------------------------------------------
# search_collection_items
# ---------------------------------------------------------------------------

class TestSearchCollectionItems:
    async def test_invalid_search_type_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(is_public=True))

        with pytest.raises(ValidationError):
            await service.search_collection_items(
                collection_id=1, user_id=1,
                query="rock", search_type="invalid",
            )

    @pytest.mark.parametrize("input_type,expected", [
        ("album", "albums"),
        ("artist", "artists"),
        ("both", "both"),
    ])
    async def test_search_type_normalization(self, input_type, expected):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(is_public=True))
        repo.search_collection_items = AsyncMock(return_value={"albums": [], "artists": []})

        await service.search_collection_items(
            collection_id=1, user_id=1, query="rock", search_type=input_type
        )

        repo.search_collection_items.assert_awaited_once_with(1, "rock", expected)

    async def test_private_collection_non_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2, is_public=False))

        with pytest.raises(ForbiddenError):
            await service.search_collection_items(
                collection_id=1, user_id=1, query="rock", search_type="both"
            )


# ---------------------------------------------------------------------------
# get_public_collections / get_user_collections
#
# Regression test: get_public_collections used to hardcode `return [], 0` on
# an empty page instead of the real total, unlike its sibling
# get_user_collections (`return [], total`). A page requested past the end
# of a non-empty result set would falsely report total=0 to the frontend.
# ---------------------------------------------------------------------------

class TestGetPublicCollections:
    async def test_empty_page_preserves_total(self):
        service, repo, *_ = make_service()
        repo.get_public_collections = AsyncMock(return_value=([], 42))

        collections, total = await service.get_public_collections(page=99, limit=10)

        assert collections == []
        assert total == 42

    async def test_dropped_item_decrements_total(self):
        """Regression test: a collection that fails to map into a response
        must not inflate total beyond what's actually rendered."""
        service, repo, *_ = make_service()
        good = make_collection(collection_id=1)
        bad = make_collection(collection_id=2)
        repo.get_public_collections = AsyncMock(return_value=([good, bad], 42))
        repo.get_collections_likes_info_batch = AsyncMock(
            return_value={"counts": {}, "user_likes": {}}
        )
        repo.get_preview_images_batch = AsyncMock(return_value={})

        def fake_build(collection, *_args, **_kwargs):
            if collection is bad:
                raise ValueError("simulated mapping failure")
            return MagicMock()

        with patch.object(service, "_build_collection_list_item", side_effect=fake_build):
            collections, total = await service.get_public_collections(page=1, limit=10)

        assert len(collections) == 1
        assert total == 41


class TestCollectionListPreviewImages:
    """Preview images feed the card mosaic."""

    def _setup(self, list_method: str):
        service, repo, *_ = make_service()
        col_with_covers = make_collection(collection_id=1)
        col_without_covers = make_collection(collection_id=2)
        for col in (col_with_covers, col_without_covers):
            col.albums_count = 6
            col.artists_count = 2
        setattr(repo, list_method, AsyncMock(return_value=([col_with_covers, col_without_covers], 2)))
        repo.get_collections_likes_info_batch = AsyncMock(
            return_value={"counts": {}, "user_likes": {}}
        )
        covers = [f"https://i.discogs.com/cover-{i}.jpg" for i in range(6)]
        repo.get_preview_images_batch = AsyncMock(return_value={1: covers})
        return service, repo, covers

    async def test_public_collections_expose_preview_images(self):
        service, repo, covers = self._setup("get_public_collections")

        with patch("app.services.collection_service.is_loaded", return_value=False):
            collections, _ = await service.get_public_collections(page=1, limit=10)

        repo.get_preview_images_batch.assert_awaited_once_with([1, 2])
        assert collections[0].preview_images == covers
        assert collections[1].preview_images == []

    async def test_user_collections_expose_preview_images(self):
        service, repo, covers = self._setup("get_user_collections")

        with patch("app.services.collection_service.is_loaded", return_value=False):
            collections, _ = await service.get_user_collections(user_id=1, page=1, limit=10)

        repo.get_preview_images_batch.assert_awaited_once_with([1, 2])
        assert collections[0].preview_images == covers
        assert collections[1].preview_images == []

    async def test_empty_page_does_not_query_preview_images(self):
        service, repo, *_ = make_service()
        repo.get_public_collections = AsyncMock(return_value=([], 5))
        repo.get_preview_images_batch = AsyncMock(return_value={})

        await service.get_public_collections(page=3, limit=10)

        repo.get_preview_images_batch.assert_not_awaited()


class TestGetUserCollectionsPagination:
    async def test_empty_page_preserves_total(self):
        service, repo, *_ = make_service()
        repo.get_user_collections = AsyncMock(return_value=([], 17))

        collections, total = await service.get_user_collections(user_id=1, page=99, limit=10)

        assert collections == []
        assert total == 17

    async def test_dropped_item_decrements_total(self):
        service, repo, *_ = make_service()
        good = make_collection(collection_id=1)
        bad = make_collection(collection_id=2)
        repo.get_user_collections = AsyncMock(return_value=([good, bad], 17))
        repo.get_collections_likes_info_batch = AsyncMock(
            return_value={"counts": {}, "user_likes": {}}
        )
        repo.get_preview_images_batch = AsyncMock(return_value={})

        def fake_build(collection, *_args, **_kwargs):
            if collection is bad:
                raise ValueError("simulated mapping failure")
            return MagicMock()

        with patch.object(service, "_build_collection_list_item", side_effect=fake_build):
            collections, total = await service.get_user_collections(user_id=1, page=1, limit=10)

        assert len(collections) == 1
        assert total == 16


# ---------------------------------------------------------------------------
# delete_collection
# ---------------------------------------------------------------------------

class TestDeleteCollection:
    async def test_success_returns_true(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=1))
        repo.delete = AsyncMock()

        result = await service.delete_collection(user_id=1, collection_id=1)
        assert result is True
        repo.delete.assert_awaited_once()

    async def test_not_found_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.delete_collection(user_id=1, collection_id=99)

    async def test_not_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2))

        with pytest.raises(ForbiddenError):
            await service.delete_collection(user_id=1, collection_id=1)


class TestSharedCollection:
    def _service_with(self, collection, records=([], 0), wishlist=([], 0)):
        service, repo, _, album_repo = make_service()
        repo.find_by_share_token = AsyncMock(return_value=collection)
        album_repo.get_collection_records_paginated = AsyncMock(return_value=records)
        repo.get_collection_artists_paginated = AsyncMock(return_value=([], 0))
        repo.get_collections_likes_info_batch = AsyncMock(return_value={"counts": {1: 4}, "user_likes": {}})
        repo.get_preview_images_batch = AsyncMock(return_value={1: ["https://i.discogs.com/a.jpg"]})
        service.wishlist_repository.get_user_wishlist_paginated = AsyncMock(return_value=wishlist)
        return service, album_repo

    @pytest.mark.parametrize("read", [
        lambda service: service.get_shared_collection("token"),
        lambda service: service.get_shared_items("token", "records"),
        lambda service: service.get_shared_items("token", "wishlist"),
    ])
    async def test_private_collection_is_refused_without_a_log_line(self, read):
        service, album_repo = self._service_with(make_collection(is_public=False))

        with pytest.raises(ForbiddenError) as refused:
            await read(service)

        assert refused.value.should_log is False
        album_repo.get_collection_records_paginated.assert_not_awaited()
        service.wishlist_repository.get_user_wishlist_paginated.assert_not_awaited()

    async def test_missing_collection_is_not_found(self):
        service, repo, *_ = make_service()
        repo.find_by_share_token = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.get_shared_collection("token")

    async def test_presentation_with_its_counts(self):
        service, _ = self._service_with(make_collection(), wishlist=([], 5))

        shared = await service.get_shared_collection("token")

        assert (shared.likes_count, shared.wishlist_count) == (4, 5)
        assert shared.cover_url == "https://i.discogs.com/a.jpg"
        assert shared.owner_username is None

    @pytest.mark.parametrize("total, visible", [(0, 0), (3, 3), (6, 6), (10, 6), (15, 6), (16, 7), (86, 35), (100, 40)])
    def test_a_visitor_sees_forty_percent_and_a_few_at_least(self, total, visible):
        assert shared_visible_items(total) == visible

    async def test_an_empty_list_is_one_empty_page(self):
        service, _ = self._service_with(make_collection())

        shared = await service.get_shared_items("token", "records")

        assert (shared.page, shared.total_pages, shared.visible_count) == (1, 1, 0)

    async def test_a_page_past_the_limit_gives_the_last_visible_one(self):
        service, album_repo = self._service_with(make_collection(), records=([], 86))

        shared = await service.get_shared_items("token", "records", page=99)

        assert (shared.page, shared.total_pages) == (4, 4)
        assert album_repo.get_collection_records_paginated.await_args.args[1] == 4

    async def test_the_wishlist_is_whole_for_who_wants_to_offer_a_record(self):
        service, _ = self._service_with(make_collection(owner_id=3), wishlist=([], 86))

        shared = await service.get_shared_items("token", "wishlist", page=9)

        assert (shared.page, shared.total_pages, shared.visible_count) == (9, 9, 86)
        service.wishlist_repository.get_user_wishlist_paginated.assert_awaited_once_with(3, 9, 10)


class TestOnlyTheOwnerWrites:
    """A public collection opens to everyone: reading it gives no right on it."""

    @pytest.mark.parametrize("write", [
        lambda service: service.update_collection(2, 1, CollectionUpdate(name="Taken")),
        lambda service: service.delete_collection(2, 1),
        lambda service: service.save_copy(2, 1),
        lambda service: service.remove_album_from_collection(2, 1, 5),
        lambda service: service.remove_artist_from_collection(2, 1, 5),
        lambda service: service.confirm_album_pressing(2, 1, 5),
        lambda service: service.delete_album_copy(2, 1, 5, 9),
    ])
    async def test_another_member_is_refused(self, write):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=1, is_public=True))
        repo.delete = AsyncMock()
        repo.update = AsyncMock()

        with pytest.raises(ForbiddenError):
            await write(service)

        repo.delete.assert_not_awaited()
        repo.update.assert_not_awaited()


class TestSavedCopyName:
    def test_dates_the_save_in_paris_time_whatever_the_process_timezone(self, monkeypatch):
        """23:30 UTC on 29 October is already 30 October in Paris: the name says the 30th."""
        import time
        from datetime import datetime as real_datetime, timezone
        from app.services import collection_service

        class FrozenDatetime(real_datetime):
            @classmethod
            def now(cls, tz=None):
                instant = real_datetime(2026, 10, 29, 23, 30, tzinfo=timezone.utc)
                return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

        monkeypatch.setattr(collection_service, "datetime", FrozenDatetime, raising=False)
        monkeypatch.setenv("TZ", "UTC")
        time.tzset()
        try:
            assert collection_service.saved_copy_name("Jazz shelf") == "SAVE Jazz shelf (2026-10-30)"
        finally:
            monkeypatch.undo()
            time.tzset()
