from fastapi import FastAPI
from app.db import models
from app.db.session import engine
from app.api.endpoints import users

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users.router)
