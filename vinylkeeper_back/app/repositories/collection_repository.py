from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, NoResultFound
from app.models.collection_model import Collection
from app.models.album_model import Album
from app.models.artist_model import Artist


class CollectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, collection: Collection) -> Collection:
        self.db.add(collection)
        try:
            self.db.commit()
            self.db.refresh(collection)
            return collection
        except IntegrityError as e:
            self.db.rollback()
            raise

    def get_by_id(self, collection_id: int) -> Collection:
        collection = self.db.query(Collection).filter(
            Collection.id == collection_id).first()
        if not collection:
            raise NoResultFound(
                f"Collection with id {collection_id} not found")
        return collection

    def get_by_owner(self, owner_id: int) -> list[Collection]:
        return self.db.query(Collection).filter(Collection.owner_id == owner_id).all()

    def update(self, collection: Collection) -> Collection:
        try:
            self.db.commit()
            self.db.refresh(collection)
            return collection
        except IntegrityError:
            self.db.rollback()
            raise

    def delete(self, collection: Collection) -> None:
        self.db.delete(collection)
        self.db.commit()

    def add_albums(self, collection: Collection, album_ids: list[int]) -> None:
        albums = self.db.query(Album).filter(Album.id.in_(album_ids)).all()
        collection.albums.extend(
            [a for a in albums if a not in collection.albums])
        self.db.commit()

    def add_artists(self, collection: Collection, artist_ids: list[int]) -> None:
        artists = self.db.query(Artist).filter(Artist.id.in_(artist_ids)).all()
        collection.artists.extend(
            [a for a in artists if a not in collection.artists])
        self.db.commit()

    def remove_albums(self, collection: Collection, album_ids: list[int]) -> None:
        collection.albums = [
            a for a in collection.albums if a.id not in album_ids]
        self.db.commit()

    def remove_artists(self, collection: Collection, artist_ids: list[int]) -> None:
        collection.artists = [
            a for a in collection.artists if a.id not in artist_ids]
        self.db.commit()
