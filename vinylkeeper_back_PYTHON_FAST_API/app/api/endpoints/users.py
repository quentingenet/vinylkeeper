from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.user_schemas import User, UserCreate, UserUpdate
from app.schemas.authentication_schemas import Token, Login
from app.services.user_service import get_user_by_id, get_users, create_user, update_user, delete_user, \
    authenticate_user
from app.repositories.user_repository import get_user_by_email
from app.utils.utils_jwt import create_access_token, get_current_superuser, get_current_user, oauth2_scheme
from app.db.session import get_db
from datetime import timedelta
from app.core.config import settings
from app.core.logging import logger

router = APIRouter()


@router.post("/register", response_model=dict)
def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already taken"
        )
    try:
        db_user = create_user(db=db, user=user)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(data={"user_id": db_user.id}, expires_delta=access_token_expires)
        logger.info(f"User {db_user.username} , id {db_user.id} , email {db_user.email} : is registered")
        return {"access_token": access_token, "token_type": "Bearer"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/", response_model=List[User])
def read_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme), current_user: User = Depends(get_current_superuser)):
    """
    Endpoint to get all users, only superusers can access it.
    """
    users = get_users(db, skip=skip, limit=limit)
    return users


@router.get("/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.put("/{user_id}", response_model=User)
def update_user_endpoint(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        updated_user = update_user(db=db, user_id=user_id, user=user)
        return updated_user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{user_id}", response_model=dict)
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db)):
    success = delete_user(db=db, user_id=user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"detail": "User deleted"}


@router.post("/login", response_model=Token)
def login_for_access_token(login: Login, db: Session = Depends(get_db)):
    user = authenticate_user(db, login.email, login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"user_id": user.id}, expires_delta=access_token_expires)
    logger.info(f"User {user.username} , id {user.id} , email {user.email} : is logged in")
    return {"access_token": access_token, "token_type": "Bearer"}
