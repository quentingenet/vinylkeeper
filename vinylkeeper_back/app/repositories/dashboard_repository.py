from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.models.album_model import Album
from app.models.artist_model import Artist

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
