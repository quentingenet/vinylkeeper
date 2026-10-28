"""
Real-database integration tests for the collection card mosaic (preview_images).

Same safety model as test_real_db_relationships.py: every test runs inside an
outer transaction + SAVEPOINT that is rolled back at the end, so the copied
production data is never modified.
"""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.album_model import Album
from app.models.collection_album import CollectionAlbum
from app.models.collection_model import Collection
from app.models.reference_data.external_sources import ExternalSource
from app.repositories.collection_repository import CollectionRepository

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import make_collection_service

BASE_TIME = datetime(2026, 1, 1, tzinfo=timezone.utc)


def cover_url(tag: str) -> str:
    return f"https://i.discogs.com/itest-{tag}.jpg"


async def make_collection(session: AsyncSession, owner_id: int, is_public: bool = True) -> Collection:
    collection = Collection(
        name=f"itest preview {uuid.uuid4().hex[:8]}",
        description=None,
        is_public=is_public,
        owner_id=owner_id,
        mood_id=None,
    )
    session.add(collection)
    await session.flush()
    return collection


async def add_album(
    session: AsyncSession,
    collection_id: int,
    image_url: str | None,
    added_at: datetime | None,
) -> Album:
    source_id = (await session.execute(select(ExternalSource.id).limit(1))).scalar_one()
    album = Album(
        # Numeric, unique and far outside real Discogs IDs
        external_album_id=f"9{uuid.uuid4().int % 10**15}",
        external_source_id=source_id,
        title="itest album",
        image_url=image_url,
    )
    session.add(album)
    await session.flush()
    session.add(CollectionAlbum(
        collection_id=collection_id,
        album_id=album.id,
        created_at=added_at,
        updated_at=added_at,
    ))
    await session.flush()
    return album


class TestGetPreviewImagesBatch:
    async def test_draws_six_covers_seeded_by_current_date(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_collection(real_session, user.id)
        albums = [
            await add_album(real_session, collection.id, cover_url(f"draw-{i}"), BASE_TIME + timedelta(days=i))
            for i in range(8)
        ]
        today = (await real_session.execute(select(func.current_date()))).scalar_one()

        result = await CollectionRepository(real_session).get_preview_images_batch([collection.id])

        expected = sorted(albums, key=lambda a: hashlib.md5(f"{a.id}:{today.isoformat()}".encode()).hexdigest())
        assert result[collection.id] == [a.image_url for a in expected[:6]]

    async def test_draw_is_stable_between_requests(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_collection(real_session, user.id)
        for i in range(10):
            await add_album(real_session, collection.id, cover_url(f"stable-{i}"), BASE_TIME + timedelta(days=i))
        repository = CollectionRepository(real_session)

        first = await repository.get_preview_images_batch([collection.id])
        second = await repository.get_preview_images_batch([collection.id])

        assert first == second
        assert len(set(first[collection.id])) == 6

    async def test_skips_albums_without_cover(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_collection(real_session, user.id)
        await add_album(real_session, collection.id, None, BASE_TIME + timedelta(days=3))
        await add_album(real_session, collection.id, "", BASE_TIME + timedelta(days=2))
        await add_album(real_session, collection.id, cover_url("kept"), BASE_TIME + timedelta(days=1))

        result = await CollectionRepository(real_session).get_preview_images_batch([collection.id])

        assert result[collection.id] == [cover_url("kept")]

    async def test_groups_per_collection_and_omits_empty_ones(self, real_session):
        user = await make_test_user(real_session)
        first = await make_collection(real_session, user.id)
        second = await make_collection(real_session, user.id)
        empty = await make_collection(real_session, user.id)
        await add_album(real_session, first.id, cover_url("first"), BASE_TIME)
        await add_album(real_session, second.id, cover_url("second"), BASE_TIME)

        result = await CollectionRepository(real_session).get_preview_images_batch(
            [first.id, second.id, empty.id]
        )

        assert result == {first.id: [cover_url("first")], second.id: [cover_url("second")]}

    async def test_empty_id_list_returns_empty_dict(self, real_session):
        assert await CollectionRepository(real_session).get_preview_images_batch([]) == {}


class TestCollectionListsPreviewImages:
    async def test_user_collections_expose_preview_images(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_collection(real_session, user.id)
        for i in range(6):
            await add_album(real_session, collection.id, cover_url(f"mine-{i}"), BASE_TIME + timedelta(days=i))

        items, _ = await make_collection_service(real_session).get_user_collections(user.id, page=1, limit=10)

        item = next(i for i in items if i.id == collection.id)
        assert sorted(item.preview_images) == sorted(cover_url(f"mine-{i}") for i in range(6))

    async def test_public_list_never_exposes_private_collection_covers(self, real_session):
        owner = await make_test_user(real_session)
        viewer = await make_test_user(real_session)
        private = await make_collection(real_session, owner.id, is_public=False)
        public = await make_collection(real_session, owner.id, is_public=True)
        await add_album(real_session, private.id, cover_url("private-secret"), BASE_TIME)
        await add_album(real_session, public.id, cover_url("public-ok"), BASE_TIME)

        items, total = await make_collection_service(real_session).get_public_collections(
            page=1, limit=100, exclude_user_id=viewer.id, user_id=viewer.id
        )

        assert total <= 100, "page must cover every public collection for this check"
        assert private.id not in {i.id for i in items}
        assert all(cover_url("private-secret") not in i.preview_images for i in items)
        assert next(i for i in items if i.id == public.id).preview_images == [cover_url("public-ok")]

    async def test_query_count_does_not_grow_with_collection_count(self, real_session, real_engine):
        service = make_collection_service(real_session)

        async def count_queries(user_id: int) -> int:
            statements: list[str] = []

            def on_execute(_conn, _cursor, statement, *_args):
                statements.append(statement)

            sync_engine = real_engine.sync_engine
            event.listen(sync_engine, "before_cursor_execute", on_execute)
            try:
                await service.get_user_collections(user_id, page=1, limit=10)
            finally:
                event.remove(sync_engine, "before_cursor_execute", on_execute)
            return len(statements)

        small_owner = await make_test_user(real_session)
        big_owner = await make_test_user(real_session)
        small = await make_collection(real_session, small_owner.id)
        await add_album(real_session, small.id, cover_url("small"), BASE_TIME)
        for n in range(5):
            collection = await make_collection(real_session, big_owner.id)
            await add_album(real_session, collection.id, cover_url(f"big-{n}"), BASE_TIME)

        small_count = await count_queries(small_owner.id)
        assert small_count > 0, "the listener must actually capture the queries"
        assert await count_queries(big_owner.id) == small_count
