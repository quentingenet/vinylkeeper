from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, extract, select
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.user_model import User
from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum
from app.models.place_model import Place
from app.models.association_tables import collection_artist

class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_albums_added_per_month(self, year: int):
        query = (
            select(
                extract('month', Album.created_at).label('month'),
                func.count(Album.id).label('count')
            )
            .filter(extract('year', Album.created_at) == year)
            .group_by('month')
            .order_by('month')
        )
        result = await self.db.execute(query)
        return result.all()

    async def get_artists_added_per_month(self, year: int):
        query = (
            select(
                extract('month', Artist.created_at).label('month'),
                func.count(Artist.id).label('count')
            )
            .filter(extract('year', Artist.created_at) == year)
            .group_by('month')
            .order_by('month')
        )
        result = await self.db.execute(query)
        return result.all()

    async def count_user_artists(self, user_id: int) -> int:
        """Count unique artists added by a user to their collections"""
        query = (
            select(func.count(func.distinct(Artist.id)))
            .join(collection_artist, Artist.id == collection_artist.c.artist_id)
            .join(Collection, collection_artist.c.collection_id == Collection.id)
            .filter(Collection.owner_id == user_id)
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_latest_album(self):
        """Get the latest album added to any collection"""
        query = (
            select(Album, User.username)
            .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
            .join(Collection, CollectionAlbum.collection_id == Collection.id)
            .join(User, Collection.owner_id == User.id)
            .order_by(Album.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.first()

    async def get_latest_artist(self):
        """Get the latest artist added to any collection"""
        query = (
            select(Artist, User.username)
            .join(collection_artist, Artist.id == collection_artist.c.artist_id)
            .join(Collection, collection_artist.c.collection_id == Collection.id)
            .join(User, Collection.owner_id == User.id)
            .order_by(Artist.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.first()

    async def count_places(self, is_moderated: bool = None, is_valid: bool = None):
        query = select(func.count(Place.id))
        if is_moderated is not None:
            query = query.filter(Place.is_moderated == is_moderated)
        if is_valid is not None:
            query = query.filter(Place.is_valid == is_valid)
        result = await self.db.execute(query)
        return result.scalar()

    async def count_user_albums_total(self, user_id: int) -> int:
        """Count total albums in all collections of a user in one query"""
        query = (
            select(func.count(CollectionAlbum.collection_id))
            .join(Collection, CollectionAlbum.collection_id == Collection.id)
            .filter(Collection.owner_id == user_id)
        )
        result = await self.db.execute(query)
        return result.scalar() or 0
