from sqlalchemy import create_engine
from app.db.base import Base
from app.core.config_env import Settings

"""
This file/script is used to create the database tables.
"""

DB_USERNAME = Settings().DATABASE_USERNAME
DB_PASSWORD = Settings().DATABASE_PASSWORD
DB_HOST = Settings().DATABASE_HOST
DB_PORT = Settings().DATABASE_PORT
DB_NAME = Settings().DATABASE_NAME
DATABASE_URL = f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

if not all([DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME]):
    raise EnvironmentError("One or more database environment variables are not set.")

engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)


