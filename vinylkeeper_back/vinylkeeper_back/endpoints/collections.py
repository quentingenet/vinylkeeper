from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from sqlalchemy.orm import Session
from vinylkeeper_back.schemas.collection_schemas import CollectionCreate
from vinylkeeper_back.core.logging import logger
from vinylkeeper_back.db.session import get_db
from vinylkeeper_back.utils.auth_utils.auth import user_finder, verify_token
router = APIRouter()

@router.post("/add")
async def create_collection( request: Request, response: Response, new_collection: CollectionCreate, db: Session = Depends(get_db)):
    try:
        user = user_finder(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    except HTTPException as e:
        raise e
