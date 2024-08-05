from fastapi import FastAPI

import logging.handlers

from app.db import models
from app.db.session import engine
from app.api.endpoints import users

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

logger = logging.getLogger("app")

app.include_router(users.router, prefix="/api")

