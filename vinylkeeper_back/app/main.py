# app/main.py
import logging
import os
from fastapi import FastAPI
from app.core.security import configure_cors
from app.core.handlers import register_exception_handlers
from app.endpoints import users, collections, request_proxy, dashboard, places, admin
from app.endpoints import external_references
from app.core.lifespan import lifespan

# Set timezone to Europe/Paris to match server timezone
os.environ['TZ'] = 'Europe/Paris'

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
app.include_router(collections.router, prefix="/api/collections")
app.include_router(request_proxy.router, prefix="/api/request-proxy")
app.include_router(external_references.router,
                   prefix="/api/external-references")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(places.router, prefix="/api/places")
app.include_router(admin.router, prefix="/api/vk-admin")

@app.get("/")
def root():
    return {"message": "Welcome to the VinylKeeper API"}
