from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db.session import SessionLocal
from app.db.init_references_data_db import insert_reference_values
from app.models.reference_data.roles import Role
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        # Vérifie si les données de référence existent déjà
        if not db.query(Role).first():
            logger.warning("🟡 Insert reference data (1st launch)...")
            insert_reference_values(db)
            logger.warning("✅ Reference data inserted.")
        # Suppression du log superflu pour les lancements suivants
        yield
    finally:
        db.close()
