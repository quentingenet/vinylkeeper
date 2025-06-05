from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.user_model import User
from app.models.collection_model import Collection
from app.models.collection_album import CollectionAlbum

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_albums_added_per_month(self, year: int):
        return (
            self.db.query(
                extract('month', Album.created_at).label('month'),
                func.count(Album.id).label('count')
            )
            .filter(extract('year', Album.created_at) == year)
            .group_by('month')
            .order_by('month')
            .all()
        )

    def get_artists_added_per_month(self, year: int):
        return (
            self.db.query(
                extract('month', Artist.created_at).label('month'),
                func.count(Artist.id).label('count')
            )
            .filter(extract('year', Artist.created_at) == year)
            .group_by('month')
            .order_by('month')
            .all()
        )

    def get_latest_album(self):
        """Get the latest album added to any collection"""
        return (
            self.db.query(Album, User.username)
            .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
            .join(Collection, CollectionAlbum.collection_id == Collection.id)
            .join(User, Collection.owner_id == User.id)
            .order_by(Album.created_at.desc())
            .first()
        )

    def get_latest_artist(self):
        """Get the latest artist added to any collection"""
        return (
            self.db.query(Artist, User.username)
            .join(Artist.collections)
            .join(User, Collection.owner_id == User.id)
            .order_by(Artist.created_at.desc())
            .first()
        )
