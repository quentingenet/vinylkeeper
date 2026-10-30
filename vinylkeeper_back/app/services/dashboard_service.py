import time
from typing import Any, Optional

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.spinning_now_repository import SpinningNowRepository
from app.models.user_model import User
from app.schemas.dashboard_schema import (
    BreakdownEntry,
    CollectionBreakdownResponse,
    DashboardStatsResponse,
    EraEntry,
    LatestAddition,
    PressingsBreakdown,
    StatsCollection,
)
from app.core.exceptions import AppException, ResourceNotFoundError, ServerError
from app.core.logging import logger

_CACHE_TTL = 30.0
_cache: dict[int, tuple[Any, float]] = {}


class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository,
                 spinning_now_repository: Optional[SpinningNowRepository] = None):
        self.dashboard_repository = dashboard_repository
        # Eras, genres and moods are counted like Spinning now, where they lead
        self.spinning_now_repository = spinning_now_repository or SpinningNowRepository(dashboard_repository.db)

    async def get_breakdown(self, user: User, collection_id: Optional[int] = None) -> CollectionBreakdownResponse:
        """The records of the user, or of one of their collections, by era, genre, mood and pressing."""
        collections = [StatsCollection(id=collection_id, name=name)
                       for collection_id, name in await self.dashboard_repository.stats_collections(user.id)]
        if collection_id is not None and collection_id not in {c.id for c in collections}:
            # Someone else's collection, a saved copy or an empty one: nothing to tell about it
            raise ResourceNotFoundError("Collection", collection_id)
        scope = [collection_id] if collection_id is not None else []
        spinning, dashboard = self.spinning_now_repository, self.dashboard_repository
        counts = await dashboard.pressing_counts(user.id, scope)
        return CollectionBreakdownResponse(
            collection_id=collection_id,
            collections=collections,
            albums_total=await spinning.count_albums(user.id, scope),
            eras=[EraEntry(decade=decade, count=count) for decade, count in await spinning.era_options(user.id, scope)],
            genres=[BreakdownEntry(label=name, count=count)
                    for name, count in await spinning.genre_options(user.id, scope)],
            moods=[BreakdownEntry(label=name, count=count)
                   for name, _description, count in await spinning.mood_options(user.id, scope)],
            pressings=PressingsBreakdown(
                originals=counts.originals,
                reissues=counts.reissues,
                unknown=counts.total - counts.originals - counts.reissues,
                countries=[BreakdownEntry(label=label, count=count)
                           for label, count in await dashboard.pressing_countries(user.id, scope)],
                formats=[BreakdownEntry(label=label, count=count)
                         for label, count in await dashboard.pressing_formats(user.id, scope)],
            ),
        )

    async def get_dashboard_stats(self, user: User) -> DashboardStatsResponse:
        cached = _cache.get(user.id)
        if cached and time.monotonic() < cached[1]:
            return cached[0]

        try:
            user_stats = await self.dashboard_repository.get_user_stats_batch(user.id)
            user_albums_total = user_stats['albums_total']
            user_artists_total = user_stats['artists_total']
            user_collections_total = user_stats['collections_total']
            user_public_collections_total = user_stats['public_collections_total']

            global_counts = await self.dashboard_repository.get_global_collections_counts()
            global_albums_total = global_counts['albums_total']
            global_artists_total = global_counts['artists_total']

            latest_album_result = await self.dashboard_repository.get_latest_album()
            latest_artist_result = await self.dashboard_repository.get_latest_artist()

            places_counts = await self.dashboard_repository.get_places_counts_batch()
            moderated_places_total = places_counts['moderated_total']
            global_places_total = places_counts['global_total']

            public_collections_total = await self.dashboard_repository.get_public_collections_count()

            latest_album = None
            latest_album_id = None
            if latest_album_result:
                album, username, updated_at = latest_album_result
                latest_album_id = album.id
                display_username = "You" if username == user.username else username
                latest_album = LatestAddition(
                    id=album.id,
                    name=album.title,
                    username=display_username,
                    created_at=updated_at,
                    type="album",
                    image_url=album.image_url,
                    external_id=album.external_album_id,
                )

            latest_artist = None
            if latest_artist_result:
                artist, username, updated_at = latest_artist_result
                display_username = "You" if username == user.username else username
                latest_artist = LatestAddition(
                    id=artist.id,
                    name=artist.title,
                    username=display_username,
                    created_at=updated_at,
                    type="artist",
                    image_url=artist.image_url,
                    external_id=artist.external_artist_id
                )

            # Album ids only: the latest artist used to be added here too, hiding the album with its id
            exclude_ids = [latest_album_id] if latest_album_id else []

            recent_albums_result = await self.dashboard_repository.get_recent_albums(
                limit=12,
                exclude_ids=exclude_ids if exclude_ids else None
            )

            recent_albums = []
            if recent_albums_result:
                for album, username, updated_at in recent_albums_result:
                    recent_albums.append(LatestAddition(
                        id=album.id,
                        name=album.title,
                        username=username,
                        created_at=updated_at,
                        type="album",
                        image_url=album.image_url,
                        external_id=album.external_album_id,
                    ))

            result = DashboardStatsResponse(
                user_albums_total=user_albums_total,
                user_artists_total=user_artists_total,
                user_collections_total=user_collections_total,
                user_public_collections_total=user_public_collections_total,
                global_albums_total=global_albums_total,
                global_artists_total=global_artists_total,
                global_places_total=global_places_total,
                moderated_places_total=moderated_places_total,
                public_collections_total=public_collections_total,
                latest_album=latest_album,
                latest_artist=latest_artist,
                recent_albums=recent_albums
            )
            _cache[user.id] = (result, time.monotonic() + _CACHE_TTL)
            return result
        except AppException:
            raise
        except (IntegrityError, SQLAlchemyError) as e:
            logger.error(f"Dashboard error: {e}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get dashboard stats",
                details={}
            )
