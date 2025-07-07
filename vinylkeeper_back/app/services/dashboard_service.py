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
            albums = await self.dashboard_repository.get_albums_added_per_month(year)
            artists = await self.dashboard_repository.get_artists_added_per_month(year)

            albums_data = [0] * 12
            artists_data = [0] * 12
            for row in albums:
                albums_data[int(row.month) - 1] = row.count
            for row in artists:
                artists_data[int(row.month) - 1] = row.count

            # Total user stats
            user_collections = await self.collection_repository.get_by_owner(user.id) or []
            user_albums_total = 0
            user_artists_total = await self.dashboard_repository.count_user_artists(user.id)

            for c in user_collections:
                # Count albums through collection_albums relationship
                collection_albums = await self.collection_repository.get_collection_albums(c.id)
                user_albums_total += len(collection_albums)

            user_collections_total = len(user_collections)

            # Total global places (hardcoded for now)
            global_places_total = 12

            # Number of moderated places
            moderated_places_total = await self.dashboard_repository.count_places(is_moderated=True, is_valid=True)

            # Get latest additions
            latest_album = None
            latest_artist = None

            latest_album_result = await self.dashboard_repository.get_latest_album()
            if latest_album_result:
                album, username = latest_album_result
                display_username = "You" if username == user.username else username
                latest_album = LatestAddition(
                    id=album.id,
                    name=album.title,
                    username=display_username,
                    created_at=album.created_at,
                    type="album",
                    image_url=album.image_url
                )

            latest_artist_result = await self.dashboard_repository.get_latest_artist()
            if latest_artist_result:
                artist, username = latest_artist_result
                display_username = "You" if username == user.username else username
                latest_artist = LatestAddition(
                    id=artist.id,
                    name=artist.title,
                    username=display_username,
                    created_at=artist.created_at,
                    type="artist",
                    image_url=artist.image_url
                )

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
                latest_artist=latest_artist
            )
        except Exception as e:
            logging.error(f"Dashboard error: {e}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get dashboard stats",
                details={"error": str(e)}
            )
