"""
"Spinning now": pick records to play from the user's own collections, filtered
by moods, eras (decades), genres and collections. Pure SQL on enriched data:
no external call.
"""
from app.core.enums import MoodEnum
from app.core.exceptions import ErrorCode, ValidationError
from app.repositories.spinning_now_repository import SpinningNowFilters, SpinningNowRepository
from app.schemas.spinning_now_schema import (
    CollectionOption,
    CollectionRef,
    EraOption,
    GenreOption,
    MoodOption,
    SpinningNowAlbum,
    SpinningNowOptionsResponse,
    SpinningNowResponse,
)

MAX_FILTER_VALUES = 20
MAX_GENRE_LENGTH = 100
MIN_DECADE, MAX_DECADE = 1900, 2090
DEFAULT_LIMIT, MAX_LIMIT = 12, 50


class SpinningNowService:
    def __init__(self, repository: SpinningNowRepository):
        self.repository = repository

    async def get_options(self, user_id: int) -> SpinningNowOptionsResponse:
        return SpinningNowOptionsResponse(
            total_albums=await self.repository.count_albums(user_id),
            moods=[MoodOption(name=name, description=description, albums_count=count)
                   for name, description, count in await self.repository.mood_options(user_id)],
            eras=[EraOption(decade=decade, albums_count=count)
                  for decade, count in await self.repository.era_options(user_id)],
            genres=[GenreOption(name=name, albums_count=count)
                    for name, count in await self.repository.genre_options(user_id)],
            collections=[CollectionOption(id=collection_id, name=name, albums_count=count)
                         for collection_id, name, count in await self.repository.collection_options(user_id)],
        )

    async def pick(
        self, user_id: int, moods: list[str], decades: list[int], genres: list[str],
        collection_ids: list[int], limit: int = DEFAULT_LIMIT,
    ) -> SpinningNowResponse:
        filters = self._validate(moods, decades, genres, collection_ids, limit)
        total = await self.repository.count_matching(user_id, filters)
        albums = await self.repository.random_matching(user_id, filters, limit) if total else []
        album_ids = [album.id for album in albums]
        moods_by_album = await self.repository.moods_by_album(album_ids)
        collections_by_album = await self.repository.collections_by_album(user_id, album_ids)
        return SpinningNowResponse(
            total=total,
            items=[
                SpinningNowAlbum(
                    id=album.id,
                    external_album_id=album.external_album_id,
                    external_master_id=album.external_master_id,
                    title=album.title,
                    artist_name=album.artist_name,
                    image_url=album.image_url,
                    year=album.original_year or album.release_year,
                    genres=album.genres or [],
                    styles=album.styles or [],
                    moods=moods_by_album.get(album.id, []),
                    collections=[CollectionRef(id=collection_id, name=name)
                                 for collection_id, name in collections_by_album.get(album.id, [])],
                )
                for album in albums
            ],
        )

    @staticmethod
    def _invalid(message: str, details: dict) -> ValidationError:
        return ValidationError(error_code=ErrorCode.INVALID_INPUT, message=message, details=details)

    def _validate(
        self, moods: list[str], decades: list[int], genres: list[str], collection_ids: list[int], limit: int
    ) -> SpinningNowFilters:
        """Deduplicated, validated filters."""
        filters = SpinningNowFilters(
            moods=list(dict.fromkeys(moods)),
            decades=list(dict.fromkeys(decades)),
            genres=list(dict.fromkeys(g.strip() for g in genres if g.strip())),
            collection_ids=list(dict.fromkeys(collection_ids)),
        )
        for name, values in (("moods", filters.moods), ("eras", filters.decades),
                             ("genres", filters.genres), ("collections", filters.collection_ids)):
            if len(values) > MAX_FILTER_VALUES:
                raise self._invalid(f"Too many {name} (max {MAX_FILTER_VALUES})", {name: len(values)})
        unknown = sorted(set(filters.moods) - {mood.value for mood in MoodEnum})
        if unknown:
            raise self._invalid("Unknown mood", {"moods": unknown})
        bad_decades = [d for d in filters.decades if d % 10 or not MIN_DECADE <= d <= MAX_DECADE]
        if bad_decades:
            raise self._invalid("Eras must be decades between 1900 and 2090, e.g. 1970", {"eras": bad_decades})
        if any(len(g) > MAX_GENRE_LENGTH for g in filters.genres):
            raise self._invalid(f"Genre names are limited to {MAX_GENRE_LENGTH} characters", {})
        bad_collections = [c for c in filters.collection_ids if c <= 0]
        if bad_collections:
            raise self._invalid("Collection ids must be positive", {"collections": bad_collections})
        if not 1 <= limit <= MAX_LIMIT:
            raise self._invalid(f"Limit must be between 1 and {MAX_LIMIT}", {"limit": limit})
        return filters
