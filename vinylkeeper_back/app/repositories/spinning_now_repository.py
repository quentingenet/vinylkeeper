from dataclasses import dataclass, field
from typing import Any, Iterable, Sequence

from sqlalchemy import distinct, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.sql import Executable, Subquery

from app.core.exceptions import ServerError
from app.core.logging import logger
from app.models.album_model import Album
from app.models.album_mood_model import AlbumMood
from app.models.collection_album import CollectionAlbum
from app.models.collection_model import Collection
from app.models.reference_data.moods import Mood
from app.repositories.work_queries import work_key


@dataclass(frozen=True)
class SpinningNowFilters:
    """Validated filters: any value matches within a category, categories combine with AND."""
    moods: list[str] = field(default_factory=list)
    decades: list[int] = field(default_factory=list)
    genres: list[str] = field(default_factory=list)
    collection_ids: list[int] = field(default_factory=list)


class SpinningNowRepository:
    """Read-only queries over the albums of one user's own collections."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _rows(self, query: Executable, operation: str) -> list[Any]:
        try:
            return list((await self.db.execute(query)).all())
        except SQLAlchemyError as e:
            logger.error(f"Spinning now: failed to {operation}: {str(e)}", exc_info=True)
            raise ServerError(error_code=5000, message=f"Failed to {operation}", details={})

    @staticmethod
    def _year():
        # Original year of the work; pressing year when Discogs has no master year
        return func.coalesce(Album.original_year, Album.release_year)

    @classmethod
    def _decade(cls):
        """1975 -> 1970 (integer division on an integer column)."""
        return cls._year() // 10 * 10

    @staticmethod
    def _user_albums(user_id: int, collection_ids: Sequence[int] = ()) -> Subquery:
        """
        One album per work of the user (several pressings of a record are one record to play),
        optionally limited to some of their collections. The first pressing stands for the work.
        """
        query = (
            select(CollectionAlbum.album_id)
            .join(Collection, Collection.id == CollectionAlbum.collection_id)
            .join(Album, Album.id == CollectionAlbum.album_id)
            .where(Collection.owner_id == user_id)
            .distinct(work_key())
            .order_by(work_key(), CollectionAlbum.album_id)
        )
        if collection_ids:
            query = query.where(Collection.id.in_(collection_ids))
        return query.subquery()

    async def count_albums(self, user_id: int) -> int:
        query = select(func.count()).select_from(self._user_albums(user_id))
        return (await self._rows(query, "count albums"))[0][0]

    async def mood_options(self, user_id: int) -> list[Any]:
        user_albums = self._user_albums(user_id)
        query = (
            select(Mood.name, Mood.description, func.count().label("albums_count"))
            .select_from(user_albums)
            .join(AlbumMood, AlbumMood.album_id == user_albums.c.album_id)
            .join(Mood, Mood.id == AlbumMood.mood_id)
            .group_by(Mood.name, Mood.description)
            .order_by(func.count().desc(), Mood.name)
        )
        return await self._rows(query, "list mood options")

    async def era_options(self, user_id: int) -> list[Any]:
        user_albums = self._user_albums(user_id)
        decade = self._decade().label("decade")
        query = (
            select(decade, func.count().label("albums_count"))
            .select_from(user_albums)
            .join(Album, Album.id == user_albums.c.album_id)
            .where(self._year().is_not(None))
            .group_by(decade)
            .order_by(decade)
        )
        return await self._rows(query, "list era options")

    async def genre_options(self, user_id: int) -> list[Any]:
        user_albums = self._user_albums(user_id)
        genre = func.unnest(Album.genres).table_valued("value").render_derived(name="genre")
        query = (
            select(genre.c.value, func.count().label("albums_count"))
            .select_from(user_albums)
            .join(Album, Album.id == user_albums.c.album_id)
            .join(genre, genre.c.value.is_not(None))
            .group_by(genre.c.value)
            .order_by(func.count().desc(), genre.c.value)
        )
        return await self._rows(query, "list genre options")

    async def collection_options(self, user_id: int) -> list[Any]:
        """(id, name, number of works) of the user's collections that hold albums."""
        query = (
            select(Collection.id, Collection.name, func.count(distinct(work_key())).label("albums_count"))
            .join(CollectionAlbum, CollectionAlbum.collection_id == Collection.id)
            .join(Album, Album.id == CollectionAlbum.album_id)
            .where(Collection.owner_id == user_id)
            .group_by(Collection.id, Collection.name)
            .order_by(Collection.name)
        )
        return await self._rows(query, "list collection options")

    def _matching(self, user_id: int, filters: SpinningNowFilters):
        user_albums = self._user_albums(user_id, filters.collection_ids)
        query = select(Album).join(user_albums, user_albums.c.album_id == Album.id)
        if filters.moods:
            query = query.where(Album.id.in_(
                select(AlbumMood.album_id).join(Mood, Mood.id == AlbumMood.mood_id)
                .where(Mood.name.in_(filters.moods))
            ))
        if filters.decades:
            query = query.where(self._year().is_not(None), self._decade().in_(filters.decades))
        if filters.genres:
            query = query.where(Album.genres.overlap(filters.genres))
        return query

    async def count_matching(self, user_id: int, filters: SpinningNowFilters) -> int:
        matching = self._matching(user_id, filters).subquery()
        return (await self._rows(select(func.count()).select_from(matching), "count matching albums"))[0][0]

    async def random_matching(self, user_id: int, filters: SpinningNowFilters, limit: int) -> list[Any]:
        """Album instances in random order (Any: models use legacy Column typing)."""
        query = self._matching(user_id, filters).order_by(func.random()).limit(limit)
        return [row[0] for row in await self._rows(query, "pick matching albums")]

    async def moods_by_album(self, album_ids: Iterable[int]) -> dict[int, list[str]]:
        ids = list(album_ids)
        if not ids:
            return {}
        query = (
            select(AlbumMood.album_id, Mood.name)
            .join(Mood, Mood.id == AlbumMood.mood_id)
            .where(AlbumMood.album_id.in_(ids))
            .order_by(AlbumMood.album_id, Mood.name)
        )
        moods: dict[int, list[str]] = {}
        for album_id, name in await self._rows(query, "load album moods"):
            moods.setdefault(album_id, []).append(name)
        return moods

    async def collections_by_album(self, user_id: int, album_ids: Iterable[int]) -> dict[int, list[tuple[int, str]]]:
        """
        The user's own collections holding each album or another pressing of its work
        (an album stands for its work here), never another user's.
        """
        ids = list(album_ids)
        if not ids:
            return {}
        picked = aliased(Album)
        query = (
            select(picked.id, Collection.id, Collection.name)
            .select_from(picked)
            .join(Album, work_key(Album) == work_key(picked))
            .join(CollectionAlbum, CollectionAlbum.album_id == Album.id)
            .join(Collection, Collection.id == CollectionAlbum.collection_id)
            .where(Collection.owner_id == user_id, picked.id.in_(ids))
            .distinct()
            .order_by(picked.id, Collection.name, Collection.id)
        )
        collections: dict[int, list[tuple[int, str]]] = {}
        for album_id, collection_id, name in await self._rows(query, "load album collections"):
            collections.setdefault(album_id, []).append((collection_id, name))
        return collections
