"""
How many SQL statements the frequent small reads send, on the real database. Reading a like or a
wishlist row must not bring its user (and the user's role) or its collection along: no caller reads
them. Rolled back at the end, like every real-database test.
"""
import uuid
from contextlib import contextmanager

from sqlalchemy import event, select

from app.models.like_model import Like
from app.models.place_like_model import PlaceLike
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.external_sources import ExternalSource
from app.models.wishlist_model import Wishlist
from app.repositories.atlas_repository import AtlasRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.wishlist_repository import WishlistRepository
from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_place_reports_real_db import make_spot
from tests.integration.test_real_db_relationships import make_test_collection


@contextmanager
def counted(session):
    """The SQL statements sent through the session's connection inside the block."""
    statements = []
    engine = session.bind.sync_engine

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        yield statements
    finally:
        event.remove(engine, "before_cursor_execute", record)


class TestSmallReads:
    async def test_reading_a_collection_like_is_one_query(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        real_session.add(Like(user_id=user.id, collection_id=collection.id))
        await real_session.flush()
        real_session.expunge_all()

        with counted(real_session) as statements:
            assert await LikeRepository(real_session).is_liked_by_user(collection.id, user.id)

        assert len(statements) == 1

    async def test_liking_a_place_reads_the_like_only(self, real_session):
        user = await make_test_user(real_session)
        spot = await make_spot(real_session)
        real_session.expunge_all()
        repository = AtlasRepository(real_session)

        with counted(real_session) as statements:
            await repository.like_place(user.id, spot.id)
        # The insert, then the refresh of the like itself
        assert len(statements) == 2

        with counted(real_session) as statements:
            assert await repository.is_place_liked_by_user(user.id, spot.id)
        assert len(statements) == 1
        assert (await real_session.execute(
            select(PlaceLike).where(PlaceLike.place_id == spot.id))).scalar_one().user_id == user.id

    async def test_reading_a_wishlist_row_leaves_its_user(self, real_session):
        user = await make_test_user(real_session)
        item = Wishlist(
            user_id=user.id,
            external_id=f"9{uuid.uuid4().int % 10**15}",
            entity_type_id=(await real_session.execute(select(EntityType.id).limit(1))).scalar_one(),
            external_source_id=(await real_session.execute(select(ExternalSource.id).limit(1))).scalar_one(),
            title="itest wanted",
        )
        real_session.add(item)
        await real_session.flush()
        real_session.expunge_all()

        with counted(real_session) as statements:
            loaded = await WishlistRepository(real_session).get_by_id(item.id)

        assert loaded.id == item.id
        # The row, then its entity type and its source, which the responses show
        assert len(statements) == 3


class TestDeletesWithLikes:
    """The likes and wishlist rows no longer load their parents: deleting the parents still works."""

    async def test_a_liked_collection_and_a_liked_spot_can_be_deleted_with_their_owner(self, real_session):
        from sqlalchemy import func
        from tests.integration.test_real_db_relationships import make_collection_service
        from tests.integration.test_user_integration import make_user_service

        owner, fan = await make_test_user(real_session), await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)
        spot = await make_spot(real_session)
        real_session.add_all([
            Like(user_id=fan.id, collection_id=collection.id),
            PlaceLike(user_id=fan.id, place_id=spot.id),
            Wishlist(user_id=fan.id, external_id=f"9{uuid.uuid4().int % 10**15}", title="itest wanted",
                     entity_type_id=(await real_session.execute(select(EntityType.id).limit(1))).scalar_one(),
                     external_source_id=(await real_session.execute(select(ExternalSource.id).limit(1))).scalar_one()),
        ])
        await real_session.flush()
        real_session.expunge_all()

        await make_collection_service(real_session).delete_collection(owner.id, collection.id)
        await AtlasRepository(real_session).delete_place(spot.id)
        assert await make_user_service(real_session).delete_user(fan) is True

        async def count(model, **where):
            query = select(func.count()).select_from(model).filter_by(**where)
            return (await real_session.execute(query)).scalar_one()

        assert await count(Like, collection_id=collection.id) == 0
        assert await count(Wishlist, user_id=fan.id) == 0
