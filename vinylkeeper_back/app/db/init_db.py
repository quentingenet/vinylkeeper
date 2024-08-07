import os
from sqlalchemy import create_engine
from app.db.base import Base
from dotenv import load_dotenv

"""
This file/script is used to create the database tables.
"""

load_dotenv()

DB_USERNAME = os.getenv('DB_USERNAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')
DATABASE_URL = f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Tables created successfully")
