from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.like_model import Like


class LikeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Return the Like if it exists, else None."""
        query = select(Like).filter_by(user_id=user_id, collection_id=collection_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def find_by_user_and_collection(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Find like by user and collection."""
        return await self.get(user_id, collection_id)

    async def create_like(self, user_id: int, collection_id: int) -> Like:
        """Add a like for the user and collection."""
        like = Like(user_id=user_id, collection_id=collection_id)
        self.db.add(like)
        await self.db.commit()
        await self.db.refresh(like)
        return like

    async def remove(self, user_id: int, collection_id: int) -> None:
        """Remove the like if it exists."""
        like = await self.get(user_id, collection_id)
        if like:
            await self.db.delete(like)
            await self.db.commit()

    async def count_likes(self, collection_id: int) -> int:
        """Return the total number of likes for a collection."""
        query = select(func.count()).select_from(Like).filter_by(collection_id=collection_id)
        result = await self.db.execute(query)
        return result.scalar()

    async def count_user_likes(self, user_id: int) -> int:
        """Return the total number of likes by a user."""
        query = select(func.count()).select_from(Like).filter_by(user_id=user_id)
        result = await self.db.execute(query)
        return result.scalar()

    async def is_liked_by_user(self, collection_id: int, user_id: int) -> bool:
        """Check if a collection is liked by a user."""
        like = await self.get(user_id, collection_id)
        return like is not None
