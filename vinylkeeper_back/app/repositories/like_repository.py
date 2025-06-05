from typing import Optional
from sqlalchemy.orm import Session
from app.models.like_model import Like


class LikeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Return the Like if it exists, else None."""
        return (
            self.db.query(Like)
            .filter_by(user_id=user_id, collection_id=collection_id)
            .first()
        )

    def add(self, user_id: int, collection_id: int) -> Like:
        """Add a like for the user and collection."""
        like = Like(user_id=user_id, collection_id=collection_id)
        self.db.add(like)
        self.db.commit()
        self.db.refresh(like)
        return like

    def remove(self, user_id: int, collection_id: int) -> None:
        """Remove the like if it exists."""
        like = self.get(user_id, collection_id)
        if like:
            self.db.delete(like)
            self.db.commit()

    def count_likes(self, collection_id: int) -> int:
        """Return the total number of likes for a collection."""
        return (
            self.db.query(Like)
            .filter_by(collection_id=collection_id)
            .count()
        )
