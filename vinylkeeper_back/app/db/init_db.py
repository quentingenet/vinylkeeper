import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config_env import Settings
from app.models.base import Base

"""
This file/script is used to create the database tables.
"""
settings = Settings()

DB_USERNAME = settings.DATABASE_USERNAME
DB_PASSWORD = settings.DATABASE_PASSWORD
DB_HOST = settings.DATABASE_HOST
DB_PORT = settings.DATABASE_PORT
DB_NAME = settings.DATABASE_NAME
DATABASE_URL = f"postgresql+asyncpg://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

if not all([DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME]):
    raise EnvironmentError(
        "One or more database environment variables are not set.")

async def init_db():
    """Initialize database tables"""
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
