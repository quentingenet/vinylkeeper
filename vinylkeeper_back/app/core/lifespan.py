from contextlib import asynccontextmanager
from fastapi import FastAPI
import httpx

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

    # Startup: create shared httpx client for external API calls (Discogs, etc.)
    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=10.0),
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
    )
    logger.info("✅ Shared HTTP client initialized.")

    yield

    # Shutdown: close HTTP client
    try:
        await app.state.http_client.aclose()
        logger.info("✅ HTTP client closed successfully.")
    except Exception as e:
        logger.error(f"Error closing HTTP client: {e}")

    # Shutdown: dispose engine properly
    try:
        await engine.dispose()
        logger.info("✅ Database engine disposed successfully.")
    except Exception as e:
        logger.error(f"Error disposing engine: {e}")
