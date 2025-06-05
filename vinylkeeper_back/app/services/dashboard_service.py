from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.collection_repository import CollectionRepository
from app.models.user_model import User
from app.schemas.dashboard_schema import DashboardStatsResponse, TimeSeriesData
from app.core.exceptions import ServerError
import logging

class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository, collection_repository: CollectionRepository):
        self.dashboard_repository = dashboard_repository
        self.collection_repository = collection_repository

    def get_dashboard_stats(self, year: int, user: User) -> DashboardStatsResponse:
        try:
            months = [
                "January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"
            ]
            albums = self.dashboard_repository.get_albums_added_per_month(year)
            artists = self.dashboard_repository.get_artists_added_per_month(year)

            albums_data = [0] * 12
            artists_data = [0] * 12
            for row in albums:
                albums_data[int(row.month) - 1] = row.count
            for row in artists:
                artists_data[int(row.month) - 1] = row.count

            # Total user stats
            user_collections = self.collection_repository.get_by_owner(user.id) or []
            user_albums_total = 0
            user_artists_set = set()

            for c in user_collections:
                # Count albums through collection_albums relationship
                user_albums_total += len(c.collection_albums)
                
                # Count artists directly associated with the collection
                for artist in c.artists:
                    user_artists_set.add(artist.id)

            user_artists_total = len(user_artists_set)
            user_collections_total = len(user_collections)

            # Total global places (hardcoded for now)
            global_places_total = 12

            return DashboardStatsResponse(
                labels=months,
                datasets=[
                    TimeSeriesData(label="Albums Added", data=albums_data),
                    TimeSeriesData(label="Artists Added", data=artists_data),
                ],
                user_albums_total=user_albums_total,
                user_artists_total=user_artists_total,
                user_collections_total=user_collections_total,
                global_places_total=global_places_total
            )
        except Exception as e:
            logging.error(f"Dashboard error: {e}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get dashboard stats",
                details={"error": str(e)}
            )
