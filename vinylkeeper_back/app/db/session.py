from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config_env import settings

async_database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    async_database_url,
    echo=False,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_reset_on_return='rollback',  # safer for manual transaction management
    connect_args={
        "server_settings": {
            "application_name": "vinylkeeper_back",
            "timezone": "Europe/Paris",
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
    async with AsyncSessionLocal() as session:
        yield session

