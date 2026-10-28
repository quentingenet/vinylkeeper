"""
Real-database tests for the spinning now queries. Each test builds its own user,
collections and albums inside the rolled-back transaction (see conftest real_session).
"""
import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.album_model import Album
from app.models.album_mood_model import AlbumMood
from app.models.collection_album import CollectionAlbum
from app.models.reference_data.moods import Mood
from app.repositories.spinning_now_repository import SpinningNowRepository
from app.services.spinning_now_service import SpinningNowService
from tests.integration.conftest import make_real_test_user
from tests.integration.test_real_db_relationships import make_test_collection


async def add_album(session: AsyncSession, collection_ids: list[int], moods: list[str] = (), **values) -> Album:
    discogs_id = (await session.execute(text("SELECT id FROM external_sources WHERE name = 'discogs'"))).scalar_one()
    album = Album(external_album_id=str(uuid.uuid4().int)[:12], external_source_id=discogs_id,
                  title="itest album", enrichment_status="ok", **values)
    session.add(album)
    await session.flush()
    for collection_id in collection_ids:
        session.add(CollectionAlbum(collection_id=collection_id, album_id=album.id))
    for name in moods:
        mood_id = (await session.execute(select(Mood.id).filter(Mood.name == name))).scalar_one()
        session.add(AlbumMood(album_id=album.id, mood_id=mood_id, source="rule"))
    await session.flush()
    return album


async def library(session: AsyncSession):
    """A user with 2 collections and 4 albums, plus a stranger's album that must never show up."""
    user = await make_real_test_user(session)
    first = await make_test_collection(session, owner_id=user.id)
    second = await make_test_collection(session, owner_id=user.id)
    albums = {
        "kind_of_blue": await add_album(session, [first.id, second.id], ["calm", "mysterious"],
                                        genres=["Jazz"], original_year=1959, release_year=2019),
        "highway": await add_album(session, [first.id], ["energetic"], genres=["Rock"],
                                   original_year=1979, release_year=1979),
        "unknown_master_year": await add_album(session, [second.id], ["calm"], genres=["Jazz", "Funk / Soul"],
                                               original_year=None, release_year=1972),
        "no_year": await add_album(session, [first.id], [], genres=["Pop"]),
    }
    stranger = await make_real_test_user(session)
    stranger_collection = await make_test_collection(session, owner_id=stranger.id)
    await add_album(session, [stranger_collection.id], ["calm"], genres=["Jazz"], original_year=1959)
    return user, albums, (first, second, stranger_collection)


def service(session: AsyncSession) -> SpinningNowService:
    return SpinningNowService(SpinningNowRepository(session))


class TestOptions:
    async def test_counts_only_the_user_albums_once_each(self, real_session):
        user, _, _ = await library(real_session)

        options = await service(real_session).get_options(user.id)

        assert options.total_albums == 4  # kind_of_blue is in two collections but counted once
        assert {m.name: m.albums_count for m in options.moods} == {"calm": 2, "mysterious": 1, "energetic": 1}
        assert {g.name: g.albums_count for g in options.genres} == {"Jazz": 2, "Rock": 1, "Funk / Soul": 1, "Pop": 1}

    async def test_eras_use_original_year_then_pressing_year(self, real_session):
        user, _, _ = await library(real_session)

        options = await service(real_session).get_options(user.id)

        # 1959 (not the 2019 reissue), 1979, and 1972 from the pressing year; no-year album ignored
        assert [(e.decade, e.albums_count) for e in options.eras] == [(1950, 1), (1970, 2)]

    async def test_mood_descriptions_come_from_the_database(self, real_session):
        user, _, _ = await library(real_session)

        options = await service(real_session).get_options(user.id)

        assert all(m.description for m in options.moods)


class TestPick:
    async def test_values_of_one_category_are_combined_with_or(self, real_session):
        user, albums, _ = await library(real_session)

        result = await service(real_session).pick(user.id, ["calm", "energetic"], [], [], [], limit=50)

        assert result.total == 3
        assert {item.id for item in result.items} == {
            albums["kind_of_blue"].id, albums["highway"].id, albums["unknown_master_year"].id}

    async def test_categories_are_combined_with_and(self, real_session):
        user, albums, _ = await library(real_session)

        result = await service(real_session).pick(user.id, ["calm"], [1970], ["Jazz"], [], limit=50)

        assert [item.id for item in result.items] == [albums["unknown_master_year"].id]
        assert result.items[0].year == 1972

    async def test_reissue_is_found_in_its_original_decade(self, real_session):
        user, albums, _ = await library(real_session)

        fifties = await service(real_session).pick(user.id, [], [1950], [], [], limit=50)
        tens = await service(real_session).pick(user.id, [], [2010], [], [], limit=50)

        assert [item.id for item in fifties.items] == [albums["kind_of_blue"].id]
        assert tens.total == 0

    async def test_album_in_two_collections_is_returned_once_with_its_moods(self, real_session):
        user, albums, _ = await library(real_session)

        result = await service(real_session).pick(user.id, ["mysterious"], [], [], [], limit=50)

        assert result.total == 1
        assert result.items[0].moods == ["calm", "mysterious"]

    async def test_limit_caps_the_random_selection(self, real_session):
        user, _, _ = await library(real_session)

        result = await service(real_session).pick(user.id, [], [], [], [], limit=2)

        assert result.total == 4
        assert len(result.items) == 2

    async def test_other_users_albums_never_show_up(self, real_session):
        user, albums, _ = await library(real_session)

        result = await service(real_session).pick(user.id, ["calm"], [1950], ["Jazz"], [], limit=50)

        assert [item.id for item in result.items] == [albums["kind_of_blue"].id]


class TestCollections:
    async def test_options_list_the_user_collections_with_their_album_counts(self, real_session):
        user, _, (first, second, stranger_collection) = await library(real_session)

        options = await service(real_session).get_options(user.id)

        counts = {c.id: c.albums_count for c in options.collections}
        assert counts == {first.id: 3, second.id: 2}
        assert stranger_collection.id not in counts

    async def test_filter_by_collection(self, real_session):
        user, albums, (first, second, _) = await library(real_session)

        result = await service(real_session).pick(user.id, [], [], [], [second.id], limit=50)

        assert {item.id for item in result.items} == {albums["kind_of_blue"].id, albums["unknown_master_year"].id}

    async def test_collection_filter_combines_with_the_others(self, real_session):
        user, albums, (first, second, _) = await library(real_session)

        result = await service(real_session).pick(user.id, ["calm"], [], [], [first.id], limit=50)

        assert [item.id for item in result.items] == [albums["kind_of_blue"].id]

    async def test_album_lists_every_collection_holding_it(self, real_session):
        user, albums, (first, second, _) = await library(real_session)

        result = await service(real_session).pick(user.id, ["mysterious"], [], [], [], limit=50)

        assert {c.id for c in result.items[0].collections} == {first.id, second.id}

    async def test_another_user_collection_id_returns_nothing(self, real_session):
        user, _, (_, _, stranger_collection) = await library(real_session)

        result = await service(real_session).pick(user.id, [], [], [], [stranger_collection.id], limit=50)

        assert (result.total, result.items) == (0, [])
