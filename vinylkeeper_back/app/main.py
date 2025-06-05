from fastapi import FastAPI
import logging.handlers
from app.core.security import configure_cors
from app.endpoints import users
from app.core.config_env import Settings
from app.db.init_role import insert_default_roles


app = FastAPI(
    title="VinylKeeper API",
    description="API for the VinylKeeper Application",
    version="1.0.0"
)

configure_cors(app)

logger = logging.getLogger("app")

@app.on_event("startup")
async def startup_event():
    insert_default_roles()
    
app.include_router(users.router, prefix="/api/users")


logger.info(f"VinylKeeper API is running in {Settings().APP_ENV.upper()} mode")
@app.get("/")
async def root():
    return {"message": "Welcome to the VinylKeeper API"} 