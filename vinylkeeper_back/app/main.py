import os
from fastapi import FastAPI
from app.core.security import configure_cors
from app.core.handlers import register_exception_handlers
from app.endpoints import users, collections, request_proxy, dashboard, atlas, admin
from app.endpoints import external_references, images, spinning_now, discogs_import
from app.core.lifespan import lifespan

from app.core.config_env import settings

os.environ["TZ"] = "Europe/Paris"

# No interactive docs nor schema in production: they map every endpoint for anyone
is_production = settings.APP_ENV.lower() == "production"

app = FastAPI(
    title="VinylKeeper API",
    description="API for the VinylKeeper Application",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

configure_cors(app)
register_exception_handlers(app)

app.include_router(users.router, prefix="/api/users")
app.include_router(collections.router, prefix="/api/collections")
app.include_router(request_proxy.router, prefix="/api/request-proxy")
app.include_router(external_references.router,
                   prefix="/api/external-references")
app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(atlas.router, prefix="/api/atlas")
app.include_router(admin.router, prefix="/api/vk-admin")
app.include_router(images.router, prefix="/api/images")
app.include_router(spinning_now.router, prefix="/api/spinning-now")
app.include_router(discogs_import.router, prefix="/api/discogs-import")


@app.get("/")
async def root():
    return {"message": "Welcome to the VinylKeeper API"}


@app.get("/health")
async def health():
    return {"status": "ok"}
