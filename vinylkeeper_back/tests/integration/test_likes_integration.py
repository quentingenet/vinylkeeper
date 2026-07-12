"""
Real-database integration tests for the Likes domain (collection likes).

Same safety model as test_real_db_relationships.py: real_session runs every
test inside an outer transaction + SAVEPOINT that is rolled back at the end.
"""
import pytest
from unittest.mock import AsyncMock, patch

from app.core.exceptions import DuplicateFieldError, ResourceNotFoundError
from app.models.like_model import Like
from app.repositories.like_repository import LikeRepository

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import make_collection_service, make_test_collection


class TestLikeCollection:
    async def test_like_creates_like_and_increments_count(self, real_session):
        owner = await make_test_user(real_session)
        liker = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        service = make_collection_service(real_session)

        result = await service.like_collection(user_id=liker.id, collection_id=collection.id)

        assert result["is_liked"] is True
        assert result["likes_count"] == 1

        is_liked = await LikeRepository(real_session).is_liked_by_user(collection.id, liker.id)
        assert is_liked is True

    async def test_like_same_collection_twice_raises_duplicate(self, real_session):
        owner = await make_test_user(real_session)
        liker = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        service = make_collection_service(real_session)

        await service.like_collection(user_id=liker.id, collection_id=collection.id)

        with pytest.raises(DuplicateFieldError):
            await service.like_collection(user_id=liker.id, collection_id=collection.id)

    async def test_owner_can_like_own_collection(self, real_session):
        owner = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        service = make_collection_service(real_session)

        result = await service.like_collection(user_id=owner.id, collection_id=collection.id)
        assert result["is_liked"] is True


class TestLikeRaceCondition:
    async def test_concurrent_like_insert_raises_duplicate_not_server_error(self, real_session):
        """Regression test: simulates the TOCTOU race where two requests both
        pass the "not liked yet" check before either commits. A Like row
        already exists in the DB (as if the other request won the race);
        LikeRepository.get is patched to return None so neither the
        service's pre-check nor the repository's own internal check see it,
        forcing a real unique-constraint violation on insert. Before the
        fix, this surfaced as a generic ServerError (500) instead of
        DuplicateFieldError, because the repository's blanket
        `except SQLAlchemyError` swallowed IntegrityError."""
        owner = await make_test_user(real_session)
        liker = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)

        real_session.add(Like(user_id=liker.id, collection_id=collection.id))
        await real_session.flush()

        service = make_collection_service(real_session)

        with patch.object(LikeRepository, "get", new_callable=AsyncMock, return_value=None):
            with pytest.raises(DuplicateFieldError):
                await service.like_collection(user_id=liker.id, collection_id=collection.id)


class TestUnlikeCollection:
    async def test_unlike_removes_like_and_decrements_count(self, real_session):
        owner = await make_test_user(real_session)
        liker = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        service = make_collection_service(real_session)
        await service.like_collection(user_id=liker.id, collection_id=collection.id)

        result = await service.unlike_collection(user_id=liker.id, collection_id=collection.id)

        assert result["is_liked"] is False
        assert result["likes_count"] == 0
        assert await LikeRepository(real_session).is_liked_by_user(collection.id, liker.id) is False

    async def test_unlike_not_liked_raises_not_found(self, real_session):
        owner = await make_test_user(real_session)
        liker = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        service = make_collection_service(real_session)

        with pytest.raises(ResourceNotFoundError):
            await service.unlike_collection(user_id=liker.id, collection_id=collection.id)


class TestLikesCounting:
    async def test_multiple_users_liking_same_collection_counts_correctly(self, real_session):
        owner = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        service = make_collection_service(real_session)

        likers = [await make_test_user(real_session) for _ in range(3)]
        for liker in likers:
            await service.like_collection(user_id=liker.id, collection_id=collection.id)

        count = await LikeRepository(real_session).count_likes(collection.id)
        assert count == 3

        info = await LikeRepository(real_session).get_likes_info(collection.id, user_id=likers[0].id)
        assert info["count"] == 3
        assert info["is_liked"] is True

        info_stranger = await LikeRepository(real_session).get_likes_info(
            collection.id, user_id=owner.id
        )
        assert info_stranger["is_liked"] is False
