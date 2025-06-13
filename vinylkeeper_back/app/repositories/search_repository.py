from sqlalchemy.orm import Session
from app.core.exceptions import ServerError, ErrorCode
from app.core.logging import logger
import httpx


class SearchRepository:
    def __init__(self, db: Session):
        self.db = db
