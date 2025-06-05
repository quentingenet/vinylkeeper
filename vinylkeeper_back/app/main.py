# app/main.py
import logging
from fastapi import FastAPI
from app.core.lifespan import lifespan
from app.core.security import configure_cors
from app.core.handlers import register_exception_handlers
from app.endpoints import users

logger = logging.getLogger("app")

app = FastAPI(
    title="VinylKeeper API",
    description="API for the VinylKeeper Application",
    version="1.0.0",
    lifespan=lifespan
)

configure_cors(app)
register_exception_handlers(app)

app.include_router(users.router, prefix="/api/users")


@app.get("/")
def root():
    return {"message": "Welcome to the VinylKeeper API"}
