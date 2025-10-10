from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db.session import AsyncSessionLocal, engine
from app.db.init_references_data_db import insert_reference_values, check_reference_data_exists
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize reference data
    async with AsyncSessionLocal() as db:
        try:
            if not await check_reference_data_exists(db):
                logger.info("🟡 Insert reference data (missing tables)...")
                await insert_reference_values(db)
                logger.info("✅ Reference data inserted.")
        except Exception as e:
            logger.error(f"Failed to initialize reference data: {e}")
            raise
    
    yield
    
    # Shutdown: dispose engine properly
    try:
        await engine.dispose()
        logger.info("✅ Database engine disposed successfully.")
    except Exception as e:
        logger.error(f"Error disposing engine: {e}")
