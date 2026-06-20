import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.collection_service import CollectionService
from app.schemas.collection_schema import CollectionCreate, CollectionUpdate
from app.core.exceptions import (
    DuplicateCollectionNameError,
    ForbiddenError,
    ResourceNotFoundError,
    ValidationError,
)


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
    col.owner = None
    col.created_at = datetime.now(timezone.utc)
    col.updated_at = datetime.now(timezone.utc)
    return col


def make_service():
    repo = AsyncMock()
    repo.db = make_db()

    like_repo = AsyncMock()
    like_repo.count_likes = AsyncMock(return_value=0)
    like_repo.is_liked_by_user = AsyncMock(return_value=False)

    album_repo = AsyncMock()
    album_repo.db = make_db()

    wishlist_repo = AsyncMock()
    place_repo = AsyncMock()

    service = CollectionService(repo, like_repo, album_repo, wishlist_repo, place_repo)
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


class TestUnlikeCollection:
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

class TestGetCollectionById:
    async def test_not_found_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.get_collection_by_id(collection_id=99, user_id=1)

    async def test_private_non_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2, is_public=False))

        with pytest.raises(ForbiddenError):
            await service.get_collection_by_id(collection_id=1, user_id=1)

    async def test_public_any_user_succeeds(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=2, is_public=True))

        with patch.object(service, "_build_collection_response", new_callable=AsyncMock, return_value=MagicMock()):
            result = await service.get_collection_by_id(collection_id=1, user_id=99)

        assert result is not None

    async def test_private_owner_succeeds(self):
        service, repo, *_ = make_service()
        repo.get_by_id = AsyncMock(return_value=make_collection(owner_id=1, is_public=False))

        with patch.object(service, "_build_collection_response", new_callable=AsyncMock, return_value=MagicMock()):
            result = await service.get_collection_by_id(collection_id=1, user_id=1)

        assert result is not None


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
        repo.refresh = AsyncMock(return_value=col)

        with patch.object(service, "get_collection", new_callable=AsyncMock, return_value=MagicMock()):
            await service.update_collection(
                user_id=1, collection_id=1,
                collection_data=CollectionUpdate.model_construct(
                    name="Same name", description=None, is_public=None, mood_id=None
                ),
            )

        repo.find_by_name_and_owner.assert_not_awaited()


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
