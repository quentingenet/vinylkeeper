import time
from typing import Any

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.repositories.dashboard_repository import DashboardRepository
from app.models.user_model import User
from app.schemas.dashboard_schema import DashboardStatsResponse, LatestAddition
from app.core.exceptions import AppException, ServerError
from app.core.logging import logger

_CACHE_TTL = 30.0
_cache: dict[int, tuple[Any, float]] = {}


class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository):
        self.dashboard_repository = dashboard_repository

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
            latest_artist_id = None
            if latest_artist_result:
                artist, username, updated_at = latest_artist_result
                latest_artist_id = artist.id
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

            exclude_ids = []
            if latest_album_id:
                exclude_ids.append(latest_album_id)
            if latest_artist_id:
                exclude_ids.append(latest_artist_id)

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
