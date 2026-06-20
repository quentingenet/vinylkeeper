from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, case
from sqlalchemy.exc import SQLAlchemyError
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.user_model import User
from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum
from app.models.place_model import Place
from app.models.association_tables import CollectionArtist
from app.core.exceptions import ServerError
from app.core.logging import logger


class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_album(self):
        """Get the latest album added to any collection"""
        try:
            # Get the collection_album association with the most recent updated_at
            # Index on updated_at DESC ensures fast query execution
            query = (
                select(Album, User.username, CollectionAlbum.updated_at)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .join(Collection, CollectionAlbum.collection_id == Collection.id)
                .join(User, Collection.owner_id == User.id)
                .where(CollectionAlbum.updated_at.isnot(None))
                .order_by(CollectionAlbum.updated_at.desc())
                .limit(1)
            )
            result = await self.db.execute(query)
            return result.first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting latest album: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get latest album",
                details={}
            )

    async def get_recent_albums(self, limit: int = 5, exclude_ids: Optional[List[int]] = None):
        """Get recent albums added to any collection (for mosaic display), deduplicated per album via DISTINCT ON."""
        try:
            inner_where = [CollectionAlbum.updated_at.isnot(None)]
            if exclude_ids:
                inner_where.append(Album.id.notin_(exclude_ids))

            # DISTINCT ON (album_id) keeps only the most recent collection_album row per album
            inner = (
                select(
                    Album.id.label("album_id"),
                    User.username.label("username"),
                    CollectionAlbum.updated_at.label("updated_at"),
                )
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .join(Collection, CollectionAlbum.collection_id == Collection.id)
                .join(User, Collection.owner_id == User.id)
                .where(*inner_where)
                .distinct(Album.id)
                .order_by(Album.id, CollectionAlbum.updated_at.desc())
            ).subquery()

            query = (
                select(Album, inner.c.username, inner.c.updated_at)
                .join(inner, Album.id == inner.c.album_id)
                .order_by(inner.c.updated_at.desc())
                .limit(limit)
            )

            result = await self.db.execute(query)
            return result.all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting recent albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get recent albums",
                details={}
            )

    async def get_latest_artist(self):
        """Get the latest artist added to any collection"""
        try:
            # Get the collection_artist association with the most recent updated_at
            # Index on updated_at DESC ensures fast query execution
            query = (
                select(Artist, User.username, CollectionArtist.updated_at)
                .join(CollectionArtist, Artist.id == CollectionArtist.artist_id)
                .join(Collection, CollectionArtist.collection_id == Collection.id)
                .join(User, Collection.owner_id == User.id)
                .where(CollectionArtist.updated_at.isnot(None))
                .order_by(CollectionArtist.updated_at.desc())
                .limit(1)
            )
            result = await self.db.execute(query)
            return result.first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting latest artist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get latest artist",
                details={}
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
                .join(CollectionArtist, Artist.id == CollectionArtist.artist_id)
                .join(Collection, CollectionArtist.collection_id == Collection.id)
                .filter(Collection.owner_id == user_id)
                .scalar_subquery()
            )

            collections_count_subq = (
                select(func.count(Collection.id).label('count'))
                .filter(Collection.owner_id == user_id)
                .scalar_subquery()
            )

            public_collections_count_subq = (
                select(func.count(Collection.id).label('count'))
                .filter(Collection.owner_id == user_id, Collection.is_public.is_(True))
                .scalar_subquery()
            )

            # Combine all counts in a single query
            query = select(
                albums_count_subq.label('albums_total'),
                artists_count_subq.label('artists_total'),
                collections_count_subq.label('collections_total'),
                public_collections_count_subq.label('public_collections_total'),
            )

            result = await self.db.execute(query)
            row = result.first()

            return {
                'albums_total': row.albums_total or 0 if row else 0,
                'artists_total': row.artists_total or 0 if row else 0,
                'collections_total': row.collections_total or 0 if row else 0,
                'public_collections_total': row.public_collections_total or 0 if row else 0,
            }
        except SQLAlchemyError as e:
            logger.error(
                f"Error getting user stats batch for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user stats batch",
                details={}
            )

    async def get_places_counts_batch(self) -> dict:
        """Get both places counts (moderated and global) in a single query"""
        try:
            # Use conditional aggregation to get both counts in one query
            query = select(
                func.sum(case((Place.is_moderated.is_(True), 1), else_=0)).label(
                    'moderated_count'),
                func.count(Place.id).label('global_count')
            ).filter(Place.is_valid.is_(True))

            result = await self.db.execute(query)
            row = result.first()

            return {
                'moderated_total': row.moderated_count or 0 if row else 0,
                'global_total': row.global_count or 0 if row else 0
            }
        except SQLAlchemyError as e:
            logger.error(f"Error getting places counts batch: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get places counts batch",
                details={}
            )

    async def get_global_collections_counts(self) -> dict:
        """Get total albums and artists counts across all collections in a single optimized query"""
        try:
            albums_count_subq = (
                select(func.count(CollectionAlbum.album_id))
                .scalar_subquery()
            )

            artists_count_subq = (
                select(func.count(func.distinct(CollectionArtist.artist_id)))
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
        except SQLAlchemyError as e:
            logger.error(f"Error getting global collections counts: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get global collections counts",
                details={}
            )

    async def get_public_collections_count(self) -> int:
        """Get count of public collections that have at least one album or artist"""
        try:
            from sqlalchemy import distinct

            has_albums = select(1).where(
                CollectionAlbum.collection_id == Collection.id
            ).exists()

            has_artists = select(1).where(
                CollectionArtist.collection_id == Collection.id
            ).exists()

            count_query = select(func.count(distinct(Collection.id)))
            count_query = count_query.filter(Collection.is_public.is_(True))
            count_query = count_query.filter(has_albums | has_artists)

            result = await self.db.execute(count_query)
            count = result.scalar()
            return count or 0
        except SQLAlchemyError as e:
            logger.error(f"Error getting public collections count: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get public collections count",
                details={}
            )
