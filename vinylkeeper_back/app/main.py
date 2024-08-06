from fastapi import FastAPI
import logging.handlers
from app.core.security import configure_cors
from app.api.endpoints import users


app = FastAPI()

configure_cors(app)

logger = logging.getLogger("app")

app.include_router(users.router, prefix="/api")