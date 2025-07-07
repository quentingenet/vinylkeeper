from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db.session import AsyncSessionLocal
from app.db.init_references_data_db import insert_reference_values, check_reference_data_exists
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        try:
            # Check if all reference data exists
            if not await check_reference_data_exists(db):
                logger.warning("🟡 Insert reference data (missing tables)...")
                await insert_reference_values(db)
                logger.warning("✅ Reference data inserted.")
            yield
        finally:
            await db.close()
