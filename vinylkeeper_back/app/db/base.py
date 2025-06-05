from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

from app.models.user_model import User
