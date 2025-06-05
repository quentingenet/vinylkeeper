import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.init_role import insert_default_roles
from app.core.config_env import Settings

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        insert_default_roles()
        logger.info(
            f"VinylKeeper API is running in {Settings().APP_ENV.upper()} mode")
    except Exception:
        logger.exception("Failed to initialize application.")
    yield
    logger.info("VinylKeeper API shutdown complete.")
