from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.collection_repository import CollectionRepository
from app.models.user_model import User
from app.schemas.dashboard_schema import DashboardStatsResponse, LatestAddition
from app.core.exceptions import ServerError
import logging


class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository, collection_repository: CollectionRepository):
        self.dashboard_repository = dashboard_repository
        self.collection_repository = collection_repository

    async def get_dashboard_stats(self, user: User) -> DashboardStatsResponse:
        try:
            # Get user stats using optimized batch query (reduces from 3 queries to 2)
            user_stats = await self.dashboard_repository.get_user_stats_batch(user.id)
            user_albums_total = user_stats['albums_total']
            user_artists_total = user_stats['artists_total']
            user_collections_total = await self.collection_repository.count_by_owner(user.id)

            # Get global collections counts (albums and artists across all collections)
            global_counts = await self.dashboard_repository.get_global_collections_counts()
            global_albums_total = global_counts['albums_total']
            global_artists_total = global_counts['artists_total']

            # Get latest additions sequentially
            latest_album_result = await self.dashboard_repository.get_latest_album()
            latest_artist_result = await self.dashboard_repository.get_latest_artist()

            # Get places counts using optimized batch query (reduces from 2 queries to 1)
            places_counts = await self.dashboard_repository.get_places_counts_batch()
            moderated_places_total = places_counts['moderated_total']
            global_places_total = places_counts['global_total']

            # Process latest album
            latest_album = None
            latest_album_id = None
            if latest_album_result:
                album, username = latest_album_result
                latest_album_id = album.id
                display_username = "You" if username == user.username else username
                latest_album = LatestAddition(
                    id=album.id,
                    name=album.title,
                    username=display_username,
                    created_at=album.created_at,
                    type="album",
                    image_url=album.image_url,
                    external_id=album.external_album_id,
                )

            # Process latest artist
            latest_artist = None
            latest_artist_id = None
            if latest_artist_result:
                artist, username = latest_artist_result
                latest_artist_id = artist.id
                display_username = "You" if username == user.username else username
                latest_artist = LatestAddition(
                    id=artist.id,
                    name=artist.title,
                    username=display_username,
                    created_at=artist.created_at,
                    type="artist",
                    image_url=artist.image_url,
                    external_id=artist.external_artist_id
                )

            # Get recent albums for mosaic, excluding latest album and artist
            exclude_ids = []
            if latest_album_id:
                exclude_ids.append(latest_album_id)
            if latest_artist_id:
                exclude_ids.append(latest_artist_id)

            recent_albums_result = await self.dashboard_repository.get_recent_albums(
                limit=12,
                exclude_ids=exclude_ids if exclude_ids else None
            )

            # Process recent albums for mosaic
            recent_albums = []
            if recent_albums_result:
                for album, username in recent_albums_result:
                    recent_albums.append(LatestAddition(
                        id=album.id,
                        name=album.title,
                        username=username,
                        created_at=album.created_at,
                        type="album",
                        image_url=album.image_url,
                        external_id=album.external_album_id,
                    ))

            return DashboardStatsResponse(
                user_albums_total=user_albums_total,
                user_artists_total=user_artists_total,
                user_collections_total=user_collections_total,
                global_albums_total=global_albums_total,
                global_artists_total=global_artists_total,
                global_places_total=global_places_total,
                moderated_places_total=moderated_places_total,
                latest_album=latest_album,
                latest_artist=latest_artist,
                recent_albums=recent_albums
            )
        except Exception as e:
            logging.error(f"Dashboard error: {e}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get dashboard stats",
                details={"error": str(e)}
            )
