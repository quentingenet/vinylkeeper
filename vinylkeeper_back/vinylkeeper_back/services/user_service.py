import uuid
from sqlalchemy.orm import Session
from vinylkeeper_back.repositories.user_repository import get_user_by_email, create_user, get_user_by_uuid
from vinylkeeper_back.core.security import hash_password, verify_password
from vinylkeeper_back.schemas.user_schemas import CreateUser
from vinylkeeper_back.core.config_env import Settings
from vinylkeeper_back.repositories import user_repository
from vinylkeeper_back.mails.client_mail import MailSubject, send_mail
from vinylkeeper_back.utils.auth_utils.auth import create_reset_token, verify_reset_token

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

def send_password_reset_email(db: Session, email: str):
    try:
        user = get_user_by_email(db, email)
        if not user:
            raise AuthError("User not found")
        token = create_reset_token(user.user_uuid)
        if len(token) > 1:
            send_mail(to=user.email, subject=MailSubject.PasswordReset, token=token)
            return True
        raise AuthError("Failed to create reset token")
    except Exception as e:
        raise AuthError(f"Failed to send password reset email: {str(e)}")

def reset_password(db: Session, token: str, new_password: str):
    try:
        user_uuid = verify_reset_token(token)
        user = get_user_by_uuid(db, str(user_uuid))
        if not user:
            return False    
        else:
            user_repository.update_user_password(db, user.id, hash_password(new_password))
            return True
    except Exception as e:
        raise AuthError(f"Failed to reset password: {str(e)}")
