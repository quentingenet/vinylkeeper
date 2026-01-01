from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, case
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.user_model import User
from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum
from app.models.place_model import Place
from app.models.association_tables import collection_artist
from app.core.exceptions import ServerError
from app.core.logging import logger


class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_album(self):
        """Get the latest album added to any collection"""
        try:
            query = (
                select(Album, User.username)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .join(Collection, CollectionAlbum.collection_id == Collection.id)
                .join(User, Collection.owner_id == User.id)
                .order_by(Album.created_at.desc())
                .limit(1)
            )
            result = await self.db.execute(query)
            return result.first()
        except Exception as e:
            logger.error(f"Error getting latest album: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get latest album",
                details={"error": str(e)}
            )

    async def get_recent_albums(self, limit: int = 5, exclude_ids: Optional[List[int]] = None):
        """Get recent albums added to any collection (for mosaic display), excluding specified IDs"""
        try:
            query = (
                select(Album, User.username)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .join(Collection, CollectionAlbum.collection_id == Collection.id)
                .join(User, Collection.owner_id == User.id)
                .order_by(Album.created_at.desc())
            )

            if exclude_ids:
                query = query.filter(~Album.id.in_(exclude_ids))

            query = query.limit(limit)
            result = await self.db.execute(query)
            return result.all()
        except Exception as e:
            logger.error(f"Error getting recent albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get recent albums",
                details={"error": str(e)}
            )

    async def get_latest_artist(self):
        """Get the latest artist added to any collection"""
        try:
            query = (
                select(Artist, User.username)
                .join(collection_artist, Artist.id == collection_artist.c.artist_id)
                .join(Collection, collection_artist.c.collection_id == Collection.id)
                .join(User, Collection.owner_id == User.id)
                .order_by(Artist.created_at.desc())
                .limit(1)
            )
            result = await self.db.execute(query)
            return result.first()
        except Exception as e:
            logger.error(f"Error getting latest artist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get latest artist",
                details={"error": str(e)}
            )

    async def get_user_stats_batch(self, user_id: int) -> dict:
        """Get all user stats (albums, artists, collections) in optimized queries using subqueries"""
        try:
            # Use scalar subqueries to combine multiple counts in a single query
            albums_count_subq = (
                select(func.count(CollectionAlbum.album_id).label('count'))
                .join(Collection, CollectionAlbum.collection_id == Collection.id)
                .filter(Collection.owner_id == user_id)
                .scalar_subquery()
            )

            artists_count_subq = (
                select(func.count(func.distinct(Artist.id)).label('count'))
                .join(collection_artist, Artist.id == collection_artist.c.artist_id)
                .join(Collection, collection_artist.c.collection_id == Collection.id)
                .filter(Collection.owner_id == user_id)
                .scalar_subquery()
            )

            collections_count_subq = (
                select(func.count(Collection.id).label('count'))
                .filter(Collection.owner_id == user_id)
                .scalar_subquery()
            )

            # Combine all counts in a single query
            query = select(
                albums_count_subq.label('albums_total'),
                artists_count_subq.label('artists_total'),
                collections_count_subq.label('collections_total')
            )

            result = await self.db.execute(query)
            row = result.first()

            return {
                'albums_total': row.albums_total or 0 if row else 0,
                'artists_total': row.artists_total or 0 if row else 0,
                'collections_total': row.collections_total or 0 if row else 0
            }
        except Exception as e:
            logger.error(
                f"Error getting user stats batch for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user stats batch",
                details={"error": str(e)}
            )

    async def get_places_counts_batch(self) -> dict:
        """Get both places counts (moderated and global) in a single query"""
        try:
            # Use conditional aggregation to get both counts in one query
            query = select(
                func.sum(case((Place.is_moderated == True, 1), else_=0)).label(
                    'moderated_count'),
                func.count(Place.id).label('global_count')
            ).filter(Place.is_valid == True)

            result = await self.db.execute(query)
            row = result.first()

            return {
                'moderated_total': row.moderated_count or 0 if row else 0,
                'global_total': row.global_count or 0 if row else 0
            }
        except Exception as e:
            logger.error(f"Error getting places counts batch: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get places counts batch",
                details={"error": str(e)}
            )

    async def get_global_collections_counts(self) -> dict:
        """Get total albums and artists counts across all collections in a single optimized query"""
        try:
            albums_count_subq = (
                select(func.count(CollectionAlbum.album_id))
                .scalar_subquery()
            )

            artists_count_subq = (
                select(func.count(func.distinct(collection_artist.c.artist_id)))
                .scalar_subquery()
            )

            query = select(
                albums_count_subq.label('albums_total'),
                artists_count_subq.label('artists_total')
            )

            result = await self.db.execute(query)
            row = result.first()

            return {
                'albums_total': row.albums_total or 0 if row else 0,
                'artists_total': row.artists_total or 0 if row else 0
            }
        except Exception as e:
            logger.error(f"Error getting global collections counts: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get global collections counts",
                details={"error": str(e)}
            )
