from typing import Any, List, Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, case, distinct, func, select, tuple_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import aliased
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.user_model import User
from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum
from app.models.place_model import Place
from app.models.association_tables import CollectionArtist
from app.repositories.work_queries import work_key
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
            logger.error(f"Error getting latest album: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get latest album",
                details={}
            )

    async def get_recent_albums(self, limit: int = 5, exclude_ids: Optional[List[int]] = None):
        """
        Recent albums added to any collection (for mosaic display), one per work: the pressings
        of a record show a single cover. Works of exclude_ids (album ids) are left out entirely.
        """
        try:
            inner_where = [CollectionAlbum.updated_at.isnot(None)]
            if exclude_ids:
                excluded = aliased(Album)
                inner_where.append(work_key().notin_(
                    select(work_key(excluded)).where(excluded.id.in_(exclude_ids))
                ))

            # DISTINCT ON (work) keeps only the most recent collection_album row per work
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
                .distinct(work_key())
                .order_by(work_key(), CollectionAlbum.updated_at.desc())
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
            logger.error(f"Error getting recent albums: {str(e)}", exc_info=True)
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
            logger.error(f"Error getting latest artist: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get latest artist",
                details={}
            )

    async def get_user_stats_batch(self, user_id: int) -> dict:
        """Get all user stats (albums, artists, collections) in optimized queries using subqueries"""
        try:
            # Use scalar subqueries to combine multiple counts in a single query
            # Sum of what each collection shows: works per collection (the pressings of a record
            # count once in a collection, a record kept in two collections counts in both)
            albums_count_subq = (
                select(func.count(distinct(tuple_(CollectionAlbum.collection_id, work_key()))).label('count'))
                .select_from(CollectionAlbum)
                .join(Collection, CollectionAlbum.collection_id == Collection.id)
                .join(Album, Album.id == CollectionAlbum.album_id)
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
                f"Error getting user stats batch for user {user_id}: {str(e)}", exc_info=True)
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
            logger.error(f"Error getting places counts batch: {str(e)}", exc_info=True)
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
            logger.error(f"Error getting global collections counts: {str(e)}", exc_info=True)
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
            logger.error(f"Error getting public collections count: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get public collections count",
                details={}
            )

    # Format descriptions that tell nothing about a pressing
    NOISE_FORMATS = ("Album", "All Media")
    TOP_PRESSING_VALUES = 8

    async def _rows(self, query, operation: str) -> list[Any]:
        try:
            return list((await self.db.execute(query)).all())
        except SQLAlchemyError as e:
            logger.error(f"Dashboard: failed to {operation}: {str(e)}", exc_info=True)
            raise ServerError(error_code=5000, message=f"Failed to {operation}", details={})

    async def stats_collections(self, user_id: int) -> list[Any]:
        """(id, name) of the user's collections that hold albums, their saved copies left out."""
        query = (
            select(Collection.id, Collection.name)
            .where(Collection.owner_id == user_id, Collection.saved_from_collection_id.is_(None),
                   Collection.id.in_(select(CollectionAlbum.collection_id)))
            .order_by(Collection.name)
        )
        return await self._rows(query, "list collections for stats")

    @staticmethod
    def _user_pressings(user_id: int, collection_ids: Sequence[int] = ()):
        """Every pressing the user keeps once, however many collections hold it."""
        query = (
            select(CollectionAlbum.album_id)
            .join(Collection, Collection.id == CollectionAlbum.collection_id)
            .where(Collection.owner_id == user_id)
            .distinct()
        )
        if collection_ids:
            query = query.where(Collection.id.in_(collection_ids))
        return query.subquery()

    async def pressing_counts(self, user_id: int, collection_ids: Sequence[int] = ()) -> Any:
        """(originals, reissues, total): an original is pressed the year of its work, or earlier."""
        pressings = self._user_pressings(user_id, collection_ids)
        years_known = and_(Album.original_year.is_not(None), Album.release_year.is_not(None))
        query = (
            select(
                func.count().filter(years_known, Album.release_year <= Album.original_year).label("originals"),
                func.count().filter(years_known, Album.release_year > Album.original_year).label("reissues"),
                func.count().label("total"),
            )
            .select_from(pressings)
            .join(Album, Album.id == pressings.c.album_id)
        )
        return (await self._rows(query, "count pressings"))[0]

    async def pressing_countries(self, user_id: int, collection_ids: Sequence[int] = ()) -> list[Any]:
        pressings = self._user_pressings(user_id, collection_ids)
        query = (
            select(Album.country, func.count().label("count"))
            .select_from(pressings)
            .join(Album, Album.id == pressings.c.album_id)
            .where(Album.country.is_not(None))
            .group_by(Album.country)
            .order_by(func.count().desc(), Album.country)
            .limit(self.TOP_PRESSING_VALUES)
        )
        return await self._rows(query, "count pressing countries")

    async def pressing_formats(self, user_id: int, collection_ids: Sequence[int] = ()) -> list[Any]:
        pressings = self._user_pressings(user_id, collection_ids)
        fmt = func.unnest(Album.formats).table_valued("value").render_derived(name="fmt")
        query = (
            select(fmt.c.value, func.count().label("count"))
            .select_from(pressings)
            .join(Album, Album.id == pressings.c.album_id)
            .join(fmt, fmt.c.value.not_in(self.NOISE_FORMATS))
            .group_by(fmt.c.value)
            .order_by(func.count().desc(), fmt.c.value)
            .limit(self.TOP_PRESSING_VALUES)
        )
        return await self._rows(query, "count pressing formats")
