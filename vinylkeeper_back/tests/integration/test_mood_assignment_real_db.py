"""
Real-database tests for rule-based moods (migration 20738445c06a). Same safety
model as test_real_db_relationships.py: the outer transaction is rolled back.
"""
import uuid
import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.tag_mood_rules import TAG_MOOD_RULES
from app.models.album_model import Album
from app.models.album_mood_model import AlbumMood
from app.models.reference_data.moods import Mood
from app.repositories.mood_assignment_repository import MoodAssignmentRepository
from app.services.mood_assignment_service import MoodAssignmentService, compute_moods


async def make_enriched_album(session: AsyncSession, styles: list[str], genres: list[str],
                              status: str = "ok") -> Album:
    discogs_id = (await session.execute(
        text("SELECT id FROM external_sources WHERE name = 'discogs'"))).scalar_one()
    album = Album(external_album_id=str(uuid.uuid4().int)[:12], external_source_id=discogs_id,
                  title="itest album", styles=styles, genres=genres, enrichment_status=status)
    session.add(album)
    await session.flush()
    return album


async def moods_of(session: AsyncSession, album_id: int) -> dict[str, str]:
    rows = (await session.execute(
        select(Mood.name, AlbumMood.source).join(Mood, Mood.id == AlbumMood.mood_id)
        .filter(AlbumMood.album_id == album_id))).all()
    return {name: source for name, source in rows}


async def mood_id(session: AsyncSession, name: str) -> int:
    return (await session.execute(select(Mood.id).filter(Mood.name == name))).scalar_one()


class TestConstraints:
    async def test_rule_source_is_accepted(self, real_session):
        album = await make_enriched_album(real_session, [], [])
        real_session.add(AlbumMood(album_id=album.id, mood_id=await mood_id(real_session, "calm"), source="rule"))
        await real_session.flush()

    async def test_rule_weight_outside_range_is_rejected(self, real_session):
        calm = await mood_id(real_session, "calm")
        with pytest.raises(IntegrityError):
            async with real_session.begin_nested():
                await real_session.execute(
                    text("INSERT INTO tag_mood_rules (tag, mood_id, weight) VALUES ('itest', :m, 4)"), {"m": calm})


class TestEndToEnd:
    async def test_synced_rules_file_gives_moods_to_an_enriched_album(self, real_session):
        service = MoodAssignmentService(MoodAssignmentRepository(real_session))
        await service.sync_rules()
        album = await make_enriched_album(real_session, ["Cool Jazz", "Modal"], ["Jazz"])

        report = await service.assign([album.id])

        expected = compute_moods(["Cool Jazz", "Modal"], ["Jazz"], TAG_MOOD_RULES)
        assert expected  # the shipped rules cover this classic case
        assert await moods_of(real_session, album.id) == {name: "rule" for name in expected}
        assert report.with_moods == 1

    async def test_synced_table_matches_the_rules_file(self, real_session):
        await MoodAssignmentService(MoodAssignmentRepository(real_session)).sync_rules()

        loaded = await MoodAssignmentRepository(real_session).load_rules()

        assert loaded == TAG_MOOD_RULES

    async def test_reassigning_after_a_rule_change_replaces_rule_moods(self, real_session):
        service = MoodAssignmentService(MoodAssignmentRepository(real_session))
        album = await make_enriched_album(real_session, ["itest-style"], [])
        await service.sync_rules({"itest-style": {"calm": 3}})
        await service.assign([album.id])

        await service.sync_rules({"itest-style": {"dark": 3}})
        await service.assign([album.id])

        assert await moods_of(real_session, album.id) == {"dark": "rule"}

    async def test_llm_moods_are_never_overridden(self, real_session):
        service = MoodAssignmentService(MoodAssignmentRepository(real_session))
        await service.sync_rules({"itest-style": {"calm": 3}})
        album = await make_enriched_album(real_session, ["itest-style"], [])
        real_session.add(AlbumMood(album_id=album.id, mood_id=await mood_id(real_session, "dreamy"), source="llm"))
        await real_session.flush()

        report = await service.assign([album.id])

        assert await moods_of(real_session, album.id) == {"dreamy": "llm"}
        assert report.skipped_curated == 1

    async def test_albums_not_enriched_yet_are_ignored(self, real_session):
        service = MoodAssignmentService(MoodAssignmentRepository(real_session))
        await service.sync_rules({"itest-style": {"calm": 3}})
        album = await make_enriched_album(real_session, ["itest-style"], [], status="not_found")

        report = await service.assign([album.id])

        assert report.albums == 0
        assert await moods_of(real_session, album.id) == {}
