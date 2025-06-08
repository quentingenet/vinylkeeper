from sqlalchemy.orm import Session
from app.models.like_model import Like


class LikeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: int, collection_id: int) -> Like:
        return self.db.query(Like).filter_by(user_id=user_id, collection_id=collection_id).first()

    def add(self, user_id: int, collection_id: int) -> Like:
        like = Like(user_id=user_id, collection_id=collection_id)
        self.db.add(like)
        self.db.commit()
        self.db.refresh(like)
        return like

    def remove(self, user_id: int, collection_id: int) -> None:
        like = self.get(user_id, collection_id)
        if like:
            self.db.delete(like)
            self.db.commit()

    def count(self, collection_id: int) -> int:
        return self.db.query(Like).filter_by(collection_id=collection_id).count()
