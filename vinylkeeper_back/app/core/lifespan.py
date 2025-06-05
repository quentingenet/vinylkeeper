from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db.session import SessionLocal
from app.db.init_references_data_db import insert_reference_values, check_reference_data_exists
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        # Check if all reference data exists
        if not check_reference_data_exists(db):
            logger.warning("🟡 Insert reference data (missing tables)...")
            insert_reference_values(db)
            logger.warning("✅ Reference data inserted.")
        yield
    finally:
        db.close()
