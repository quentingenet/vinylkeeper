from fastapi import FastAPI
import logging.handlers
from app.core.security import configure_cors
from app.api.endpoints import users, collections

app = FastAPI()

configure_cors(app)

logger = logging.getLogger("app")

app.include_router(users.router, prefix="/api/users")
app.include_router(collections.router, prefix="/api/collections")
