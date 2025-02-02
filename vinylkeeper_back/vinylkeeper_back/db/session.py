from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from vinylkeeper_back.core.config_env import Settings

engine = create_engine(Settings().DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Provides a database session and automatically closes it after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
