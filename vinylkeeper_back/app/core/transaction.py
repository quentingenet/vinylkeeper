"""
Transaction management utilities for centralized database transaction handling.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any, Callable, TypeVar, Awaitable
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import logger
from app.core.exceptions import ServerError, ErrorCode

T = TypeVar('T')


@asynccontextmanager
async def transaction_context(session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database transactions.
    
    This context manager should be used in services when multiple repository
    operations need to be atomic. It handles both cases:
    - Session already in transaction: uses existing transaction
    - Session not in transaction: starts new transaction
    
    Usage in services:
        async def create_collection_with_albums(self, ...):
            async with transaction_context(self.repository.db):
                # All operations within this block are part of a single transaction
                collection = await self.repository.create(collection_data)
                await self.repository.add_albums(collection.id, album_ids)
                # Transaction is automatically committed at the end
                # or rolled back if an exception occurs
    """
    # Check if session is already in a transaction
    if session.in_transaction():
        logger.debug("🔄 Using existing transaction")
        try:
            yield session
            logger.debug("✅ Operations completed in existing transaction")
        except Exception as e:
            logger.error(f"❌ Error in existing transaction: {str(e)}")
            raise
    else:
        # Start new transaction
        async with session.begin():
            try:
                logger.debug("🔄 Starting new database transaction")
                yield session
                logger.debug("✅ Transaction committed successfully")
            except Exception as e:
                logger.error(f"❌ Transaction rolled back due to error: {str(e)}")
                raise


class TransactionalMixin:
    """
    Mixin for repositories to provide transaction-aware methods.
    
    This mixin provides methods that don't commit automatically,
    allowing services to manage transactions at a higher level.
    Optimized to reduce unnecessary flushes.
    """
    
    async def _add_entity(self, entity: Any, flush: bool = False) -> None:
        """Add entity to session without committing.
        
        Args:
            entity: The entity to add
            flush: If True, flush immediately to get the ID. Default False for performance.
        """
        self.db.add(entity)
        if flush:
            await self.db.flush()  # Only flush when explicitly requested
    
    async def _delete_entity(self, entity: Any, flush: bool = False) -> None:
        """Delete entity from session without committing.
        
        Args:
            entity: The entity to delete
            flush: If True, flush immediately. Default False for performance.
        """
        await self.db.delete(entity)
        if flush:
            await self.db.flush()  # Only flush when explicitly requested
    
    async def _refresh_entity(self, entity: Any) -> None:
        """Refresh entity from database without committing."""
        await self.db.refresh(entity)
    
    async def _flush_if_needed(self) -> None:
        """Flush the session if needed. Can be called explicitly when IDs are required."""
        await self.db.flush()
