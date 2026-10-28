from typing import Iterable, Optional

from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.album_model import Album
from app.models.album_mood_model import AlbumMood
from app.models.reference_data.moods import Mood
from app.models.tag_mood_rule_model import TagMoodRule

# Enrichment statuses where styles/genres are known (the master step only adds a year)
ENRICHED_STATUSES = ("ok", "pending_master")
CURATED_SOURCES = ("llm", "user")


class MoodAssignmentRepository:
    """Queries for rule-based album moods and for syncing tag_mood_rules. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def mood_ids_by_name(self) -> dict[str, int]:
        rows = (await self.db.execute(select(Mood.name, Mood.id))).all()
        return {name: mood_id for name, mood_id in rows}

    async def load_rules(self) -> dict[str, dict[str, int]]:
        """tag -> {mood name: weight}"""
        rows = (await self.db.execute(
            select(TagMoodRule.tag, Mood.name, TagMoodRule.weight).join(Mood, Mood.id == TagMoodRule.mood_id)
        )).all()
        rules: dict[str, dict[str, int]] = {}
        for tag, mood_name, weight in rows:
            rules.setdefault(tag, {})[mood_name] = weight
        return rules

    async def replace_rules(self, rows: list[dict]) -> None:
        """Make tag_mood_rules exactly equal to rows ({tag, mood_id, weight})."""
        await self.db.execute(delete(TagMoodRule))
        if rows:
            await self.db.execute(insert(TagMoodRule), rows)

    async def list_enriched_albums(
        self, album_ids: Optional[Iterable[int]] = None
    ) -> list[tuple[int, list[str], list[str]]]:
        """(album id, styles, genres) for albums whose Discogs tags are known."""
        query = select(Album.id, Album.styles, Album.genres).filter(
            Album.enrichment_status.in_(ENRICHED_STATUSES)).order_by(Album.id)
        if album_ids is not None:
            query = query.filter(Album.id.in_(list(album_ids)))
        return [(row.id, row.styles or [], row.genres or []) for row in (await self.db.execute(query)).all()]

    async def album_ids_with_curated_moods(self, album_ids: Iterable[int]) -> set[int]:
        """Albums whose moods come from the LLM or a user: rules must not override them."""
        ids = list(album_ids)
        if not ids:
            return set()
        query = select(AlbumMood.album_id).filter(
            AlbumMood.album_id.in_(ids), AlbumMood.source.in_(CURATED_SOURCES)).distinct()
        return set((await self.db.execute(query)).scalars().all())

    async def replace_rule_moods(self, moods_by_album: dict[int, list[int]]) -> None:
        """Replace the rule-derived moods of these albums (other sources are untouched)."""
        if not moods_by_album:
            return
        await self.db.execute(
            delete(AlbumMood).where(AlbumMood.album_id.in_(list(moods_by_album)), AlbumMood.source == "rule")
        )
        rows = [
            {"album_id": album_id, "mood_id": mood_id, "source": "rule"}
            for album_id, mood_ids in moods_by_album.items()
            for mood_id in mood_ids
        ]
        if rows:
            await self.db.execute(insert(AlbumMood), rows)
