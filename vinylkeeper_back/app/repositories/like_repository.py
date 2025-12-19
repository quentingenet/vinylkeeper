from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.models.like_model import Like
from app.core.exceptions import ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class LikeRepository(TransactionalMixin):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Return the Like if it exists, else None."""
        try:
            query = select(Like).filter_by(
                user_id=user_id, collection_id=collection_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Error retrieving like for user {user_id} and collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get like",
                details={"error": str(e)}
            )

    async def find_by_user_and_collection(self, user_id: int, collection_id: int) -> Optional[Like]:
        """Find like by user and collection."""
        return await self.get(user_id, collection_id)

    async def create_like(self, user_id: int, collection_id: int) -> Like:
        """Add a like for the user and collection without committing (transaction managed by service)."""
        try:
            # Check if like already exists
            existing_like = await self.get(user_id, collection_id)
            if existing_like:
                logger.warning(
                    f"Like already exists for user {user_id} and collection {collection_id}")
                return existing_like

            like = Like(user_id=user_id, collection_id=collection_id)
            # Flush needed for refresh
            await self._add_entity(like, flush=True)
            await self._refresh_entity(like)
            return like
        except Exception as e:
            logger.error(
                f"Error creating like for user {user_id} and collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create like",
                details={"error": str(e)}
            )

    async def remove(self, user_id: int, collection_id: int) -> None:
        """Remove the like if it exists without committing (transaction managed by service)."""
        try:
            like = await self.get(user_id, collection_id)
            if like:
                # No flush needed for deletion
                await self._delete_entity(like, flush=False)
            else:
                logger.warning(
                    f"Like not found for user {user_id} and collection {collection_id}")
        except Exception as e:
            logger.error(
                f"Error removing like for user {user_id} and collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove like",
                details={"error": str(e)}
            )

    async def count_likes(self, collection_id: int) -> int:
        """Return the total number of likes for a collection."""
        try:
            query = select(func.count()).select_from(
                Like).filter_by(collection_id=collection_id)
            result = await self.db.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(
                f"Error counting likes for collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to count likes",
                details={"error": str(e)}
            )

    async def count_user_likes(self, user_id: int) -> int:
        """Return the total number of likes by a user."""
        try:
            query = select(func.count()).select_from(
                Like).filter_by(user_id=user_id)
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
            logger.error(
                f"Error checking if collection {collection_id} is liked by user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to check like status",
                details={"error": str(e)}
            )

    async def get_likes_info(self, collection_id: int, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get likes count and is_liked status in a single query (optimized).

        Returns:
            dict: {"count": int, "is_liked": bool}
        """
        try:
            # Single query with aggregation and conditional check
            query = select(
                func.count(Like.id).label("count"),
                func.max(
                    case(
                        (Like.user_id == user_id, 1),
                        else_=0
                    )
                ).label("is_liked")
            ).filter(Like.collection_id == collection_id)

            result = await self.db.execute(query)
            row = result.one()

            return {
                "count": row.count or 0,
                "is_liked": bool(row.is_liked) if user_id is not None else False
            }
        except Exception as e:
            logger.error(
                f"Error getting likes info for collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get likes info",
                details={"error": str(e)}
            )
