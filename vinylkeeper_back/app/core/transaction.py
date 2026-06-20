"""
Transaction management utilities for centralized database transaction handling.
"""
from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import AsyncGenerator, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import logger

_transaction_depth: ContextVar[int] = ContextVar('_transaction_depth', default=0)


@asynccontextmanager
async def transaction_context(session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database transactions with reentrancy support.

    Only the outermost call flushes and commits; nested calls yield without
    managing the transaction, preserving atomicity when services call each other.
    Rolls back on exception at the outermost level.
    """
    depth = _transaction_depth.get()
    token = _transaction_depth.set(depth + 1)
    try:
        if depth > 0:
            yield session
        else:
            try:
                yield session
                await session.flush()
                await session.commit()
            except Exception as e:
                logger.error(f"❌ Transaction rolled back due to error: {str(e)}")
                await session.rollback()
                raise
    finally:
        _transaction_depth.reset(token)


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
