from fastapi import FastAPI

import logging.handlers

from app.core.security import configure_cors
from app.db import models
from app.db.session import engine
from app.api.endpoints import users

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

configure_cors(app)

logger = logging.getLogger("app")

app.include_router(users.router, prefix="/api")

