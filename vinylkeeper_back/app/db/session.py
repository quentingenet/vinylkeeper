from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config_env import settings

# Convert DATABASE_URL to async format
async_database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Pool configuration for PostgreSQL
engine = create_async_engine(
    async_database_url,
    echo=False,  # Set to True for SQL debugging
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_reset_on_return='rollback',  # Reset connection state on return (safer for manual transaction management)
    # PostgreSQL specific optimizations
    connect_args={
        "server_settings": {
            "application_name": "vinylkeeper_back",
            "timezone": "UTC",
            "statement_timeout": str(settings.DB_STATEMENT_TIMEOUT),
            "lock_timeout": str(settings.DB_LOCK_TIMEOUT),
        }
    }
)

AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)


async def get_db():
    """
    Provides an async database session and automatically closes it after use.
    """
    async with AsyncSessionLocal() as session:
        yield session

