from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.like_model import Like
from app.core.exceptions import ServerError
from app.core.logging import logger


class LikeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Return the Like if it exists, else None."""
        try:
            query = select(Like).filter_by(user_id=user_id, collection_id=collection_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving like for user {user_id} and collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get like",
                details={"error": str(e)}
            )

    async def find_by_user_and_collection(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Find like by user and collection."""
        return await self.get(user_id, collection_id)

    async def create_like(self, user_id: int, collection_id: int) -> Like:
        """Add a like for the user and collection."""
        try:
            like = Like(user_id=user_id, collection_id=collection_id)
            self.db.add(like)
            await self.db.commit()
            await self.db.refresh(like)
            return like
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating like for user {user_id} and collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create like",
                details={"error": str(e)}
            )

    async def remove(self, user_id: int, collection_id: int) -> None:
        """Remove the like if it exists."""
        try:
            like = await self.get(user_id, collection_id)
            if like:
                await self.db.delete(like)
                await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error removing like for user {user_id} and collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove like",
                details={"error": str(e)}
            )

    async def count_likes(self, collection_id: int) -> int:
        """Return the total number of likes for a collection."""
        try:
            query = select(func.count()).select_from(Like).filter_by(collection_id=collection_id)
            result = await self.db.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"Error counting likes for collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to count likes",
                details={"error": str(e)}
            )

    async def count_user_likes(self, user_id: int) -> int:
        """Return the total number of likes by a user."""
        try:
            query = select(func.count()).select_from(Like).filter_by(user_id=user_id)
            result = await self.db.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"Error counting likes for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to count user likes",
                details={"error": str(e)}
            )

    async def is_liked_by_user(self, collection_id: int, user_id: int) -> bool:
        """Check if a collection is liked by a user."""
        try:
            like = await self.get(user_id, collection_id)
            return like is not None
        except Exception as e:
            logger.error(f"Error checking if collection {collection_id} is liked by user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to check like status",
                details={"error": str(e)}
            )
