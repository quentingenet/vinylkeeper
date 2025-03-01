import uuid
from api.repositories.user_repository import UserRepository
from api.core.security import hash_password, verify_password
from api.schemas.user_schemas import CreateUser
from api.core.config_env import Settings
from api.mails.client_mail import MailSubject, send_mail
from api.utils.auth_utils.auth import create_reset_token, verify_reset_token
from fastapi import Depends, BackgroundTasks
from sqlalchemy.orm import Session
from api.db.session import get_db

class AuthError(Exception):
    pass

class UserService:
    
    def __init__(self, db: Session = Depends(get_db)):
        self.user_repo = UserRepository(db)

    def authenticate_user(self, email: str, password: str):
        user = self.user_repo.get_user_by_email(email)
        if user and verify_password(user.password, password):
            self.user_repo.update_user_last_login(user.id)
            return user
        raise AuthError("Invalid credentials")

    def register_user(self, user_data: dict):
        try:
            validated_data = CreateUser(**user_data)
            user_data = validated_data.dict()
            user_data["password"] = hash_password(validated_data.password)
            user_data["user_uuid"] = str(uuid.uuid4())
            user_data["role_id"] = Settings().DEFAULT_ROLE_ID
            return self.user_repo.create_user(user_data)
        except Exception as e:
            raise AuthError(f"User registration failed: {str(e)}")

    def send_password_reset_email(self, email: str, background_tasks: BackgroundTasks):
        try:
            user = self.user_repo.get_user_by_email(email)
            if not user:
                raise AuthError("User not found")

            token = create_reset_token(user.user_uuid)
            if not token:
                raise AuthError("Failed to create reset token")
            
            background_tasks.add_task(
                send_mail, 
                to=user.email, 
                subject=MailSubject.PasswordReset, 
                token=token
            )

            return True
        except Exception as e:
            raise AuthError(f"Failed to send password reset email: {str(e)}")

    def reset_password(self, token: str, new_password: str):
        try:
            user_uuid = verify_reset_token(token)
            user = self.user_repo.get_user_by_uuid(str(user_uuid))
            if not user:
                return False    
            else:
                self.user_repo.update_user_password(user.id, hash_password(new_password))
                return True
        except Exception as e:
            raise AuthError(f"Failed to reset password: {str(e)}")

    def create_user(self, user_data: dict):
        return self.user_repo.create_user(user_data)