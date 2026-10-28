"""
Real-database tests for the mood vocabulary v2 migration (ac822a1dbbb3).

Run against the local production copy once it is migrated. Same safety model as
test_real_db_relationships.py: everything happens inside an outer transaction that
is rolled back, and each expected failure is isolated in its own SAVEPOINT.
"""
import uuid
import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import MoodEnum
from app.db.init_references_data_db import MOOD_DESCRIPTIONS
from app.models.album_model import Album
from app.models.album_mood_model import AlbumMood
from app.models.collection_model import Collection
from app.models.reference_data.moods import Mood
from app.repositories.collection_repository import CollectionRepository


async def make_test_album(session: AsyncSession) -> Album:
    external_source_id = (await session.execute(
        text("SELECT id FROM external_sources ORDER BY id LIMIT 1")
    )).scalar_one()
    album = Album(
        external_album_id=str(uuid.uuid4().int)[:12],
        external_source_id=external_source_id,
        title="itest album",
    )
    session.add(album)
    await session.flush()
    return album


async def mood_id(session: AsyncSession, name: str) -> int:
    return (await session.execute(select(Mood.id).filter(Mood.name == name))).scalar_one()


class TestMoodVocabularyInDatabase:
    async def test_mood_names_match_enum(self, real_session):
        names = (await real_session.execute(select(Mood.name))).scalars().all()
        assert sorted(names) == sorted(m.value for m in MoodEnum)

    async def test_every_mood_has_the_expected_description(self, real_session):
        rows = (await real_session.execute(select(Mood.name, Mood.description))).all()
        assert {name: description for name, description in rows} == MOOD_DESCRIPTIONS


class TestAlbumMoodsConstraints:
    async def test_valid_row_is_accepted(self, real_session):
        album = await make_test_album(real_session)
        real_session.add(AlbumMood(album_id=album.id, mood_id=await mood_id(real_session, "calm"), source="llm"))
        await real_session.flush()

        count = (await real_session.execute(
            text("SELECT count(*) FROM album_moods WHERE album_id = :id"), {"id": album.id}
        )).scalar_one()
        assert count == 1

    async def test_duplicate_album_mood_is_rejected(self, real_session):
        album = await make_test_album(real_session)
        calm_id = await mood_id(real_session, "calm")
        real_session.add(AlbumMood(album_id=album.id, mood_id=calm_id, source="llm"))
        await real_session.flush()

        with pytest.raises(IntegrityError):
            async with real_session.begin_nested():
                await real_session.execute(
                    text("INSERT INTO album_moods (album_id, mood_id, source) VALUES (:a, :m, 'user')"),
                    {"a": album.id, "m": calm_id},
                )

    async def test_unknown_source_is_rejected(self, real_session):
        album = await make_test_album(real_session)
        calm_id = await mood_id(real_session, "calm")

        with pytest.raises(IntegrityError):
            async with real_session.begin_nested():
                await real_session.execute(
                    text("INSERT INTO album_moods (album_id, mood_id, source) VALUES (:a, :m, 'other')"),
                    {"a": album.id, "m": calm_id},
                )

    async def test_deleting_an_album_cascades_to_its_moods(self, real_session):
        album = await make_test_album(real_session)
        real_session.add(AlbumMood(album_id=album.id, mood_id=await mood_id(real_session, "dark"), source="llm"))
        await real_session.flush()

        await real_session.execute(text("DELETE FROM albums WHERE id = :id"), {"id": album.id})

        count = (await real_session.execute(
            text("SELECT count(*) FROM album_moods WHERE album_id = :id"), {"id": album.id}
        )).scalar_one()
        assert count == 0

    async def test_deleting_a_referenced_mood_is_rejected(self, real_session):
        album = await make_test_album(real_session)
        dreamy_id = await mood_id(real_session, "dreamy")
        real_session.add(AlbumMood(album_id=album.id, mood_id=dreamy_id, source="llm"))
        await real_session.flush()

        with pytest.raises(IntegrityError):
            async with real_session.begin_nested():
                await real_session.execute(text("DELETE FROM moods WHERE id = :id"), {"id": dreamy_id})


class TestCollectionsUnaffected:
    """Mood.collections is now lazy="raise": loading collections must not touch it."""

    async def test_collection_loads_with_relations_and_mood_id_unchanged(self, real_session):
        row = (await real_session.execute(
            text("SELECT id, mood_id FROM collections ORDER BY id LIMIT 1")
        )).one_or_none()
        if row is None:
            pytest.skip("No collection in the database copy")

        collection = await CollectionRepository(real_session).get_by_id(row.id, load_relations=True)

        assert collection.id == row.id
        assert collection.mood_id == row.mood_id
        assert collection.mood is None or isinstance(collection.mood, Mood)

    async def test_public_collections_listing_still_works(self, real_session):
        collections, total = await CollectionRepository(real_session).get_public_collections(page=1, limit=10)

        assert total >= len(collections)
        assert all(isinstance(c, Collection) for c in collections)
