import asyncio
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.collection_repository import CollectionRepository
from app.models.user_model import User
from app.schemas.dashboard_schema import DashboardStatsResponse, TimeSeriesData, LatestAddition
from app.core.exceptions import ServerError
import logging


class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository, collection_repository: CollectionRepository):
        self.dashboard_repository = dashboard_repository
        self.collection_repository = collection_repository

    async def get_dashboard_stats(self, year: int, user: User) -> DashboardStatsResponse:
        try:
            months = [
                "January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"
            ]
            # Get monthly stats in parallel
            albums, artists = await asyncio.gather(
                self.dashboard_repository.get_albums_added_per_month(year),
                self.dashboard_repository.get_artists_added_per_month(year)
            )

            albums_data = [0] * 12
            artists_data = [0] * 12
            for row in albums:
                albums_data[int(row.month) - 1] = row.count
            for row in artists:
                artists_data[int(row.month) - 1] = row.count

            # Total user stats - optimized with batch queries
            user_albums_total, user_artists_total, user_collections_total = await asyncio.gather(
                self.dashboard_repository.count_user_albums_total(user.id),
                self.dashboard_repository.count_user_artists(user.id),
                self.collection_repository.count_by_owner(user.id)
            )

            # Get latest additions and places counts in parallel
            latest_album_result, latest_artist_result, moderated_places_total, global_places_total = await asyncio.gather(
                self.dashboard_repository.get_latest_album(),
                self.dashboard_repository.get_latest_artist(),
                self.dashboard_repository.count_places(
                    is_moderated=True, is_valid=True),
                self.dashboard_repository.count_places(is_valid=True)
            )

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
                labels=months,
                datasets=[
                    TimeSeriesData(label="Albums Added", data=albums_data),
                    TimeSeriesData(label="Artists Added", data=artists_data),
                ],
                user_albums_total=user_albums_total,
                user_artists_total=user_artists_total,
                user_collections_total=user_collections_total,
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
