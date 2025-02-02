import uuid
from sqlalchemy.orm import Session
from vinylkeeper_back.repositories.user_repository import get_user_by_email, create_user
from vinylkeeper_back.core.security import hash_password, verify_password
from vinylkeeper_back.schemas.user_schemas import CreateUser
from vinylkeeper_back.core.config_env import Settings
from vinylkeeper_back.repositories import user_repository

class AuthError(Exception):
    pass

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if user and verify_password(user.password, password):
        user_repository.update_user_last_login(db, user.id)
        return user
    raise AuthError("Invalid credentials")

def register_user(db: Session, user_data: dict):
    try:
        validated_data = CreateUser(**user_data)
        user_data = validated_data.dict()
        user_data["password"] = hash_password(validated_data.password)
        user_data["user_uuid"] = str(uuid.uuid4())
        user_data["role_id"] = Settings().DEFAULT_ROLE_ID
        return create_user(db, user_data)
    except Exception as e:
        raise AuthError(f"User registration failed: {str(e)}")
