from fastapi import FastAPI
import logging.handlers
from api.core.security import configure_cors
from api.endpoints import users, collections, request_proxy, external_references, encryption, music_metadata
from api.core.config_env import Settings
from api.db.init_role import insert_default_roles

app = FastAPI()

configure_cors(app)

logger = logging.getLogger("app")

@app.on_event("startup")
async def startup_event():
    insert_default_roles()
    
app.include_router(users.router, prefix="/api/users")
app.include_router(collections.router, prefix="/api/collections")
app.include_router(request_proxy.router, prefix="/api/request-proxy")
app.include_router(external_references.router, prefix="/api/external")
app.include_router(encryption.router, prefix="/api/encryption")
app.include_router(music_metadata.router, prefix="/api/music-metadata")

logger.info(f"VinylKeeper API is running in {Settings().APP_ENV.upper()} mode")