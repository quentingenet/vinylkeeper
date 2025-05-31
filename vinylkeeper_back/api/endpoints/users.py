from fastapi import APIRouter, HTTPException, status, Response, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from api.services.user_service import UserService, AuthError
from api.utils.auth_utils.auth import TokenType, create_token, get_current_user
from api.schemas.user_schemas import AuthUser, CreateUser, EmailUpdatePassword, ResetPassword, User
from jose import JWTError
from api.core.config_env import Settings
from api.db.session import get_db
from api.core.logging import logger
from api.utils.auth_utils.auth import set_token_cookie
from api.mails.client_mail import MailSubject, send_mail
from api.middleware.auth_middleware import verify_auth_token
from api.models.user_model import User

router = APIRouter()

def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)

@router.post("/auth", status_code=status.HTTP_200_OK)
async def authenticate(response: Response, auth_user: AuthUser, service: UserService = Depends(get_user_service)):
    try:
        user = service.authenticate_user(auth_user.email, auth_user.password)
        access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
        set_token_cookie(response, access_token, TokenType.ACCESS)

        logger.info(f"User logged in: {user.username} - {user.email}")
        return {"isLoggedIn": True}
    except AuthError as e:
        logger.warning(f"Failed login attempt: {auth_user.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def create_user(
    response: Response,
    new_user: CreateUser,
    background_tasks: BackgroundTasks,
    service: UserService = Depends(get_user_service),
):
    try:
        user = service.register_user(new_user.dict())
        access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
        set_token_cookie(response, access_token, TokenType.ACCESS)

        logger.info(f"New user registered: {user.username} - {user.email}")

        background_tasks.add_task(
            send_mail, 
            Settings().EMAIL_ADMIN, 
            MailSubject.NewUserRegistered, 
            username=user.username, 
            user_email=user.email
        )

        return {"message": "User registered successfully", "isLoggedIn": True}

    except AuthError as e:
        logger.error(f"User registration failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/check-auth", status_code=status.HTTP_200_OK)
async def check_auth(response: Response, user_uuid: str = Depends(verify_auth_token)):
    try:
        if not user_uuid:
            return {"isLoggedIn": False}
        access_token = create_token(user_uuid, TokenType.ACCESS)
        refresh_token = create_token(user_uuid, TokenType.REFRESH)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        set_token_cookie(response, refresh_token, TokenType.REFRESH)
        return {"isLoggedIn": True}
    except JWTError as e:
        logger.warning("Invalid or expired authentication token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user_info(
    user: User = Depends(get_current_user)
):
    """Get current user information"""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "user_uuid": str(user.user_uuid)
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    try:
        set_token_cookie(response, "", TokenType.ACCESS, custom_max_age=0)
        set_token_cookie(response, "", TokenType.REFRESH, custom_max_age=0)
        return {"message": "Logged out successfully", "isLoggedIn": False}
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Logout failed")

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    email: EmailUpdatePassword, 
    background_tasks: BackgroundTasks,
    service: UserService = Depends(get_user_service)
):
    try:
        service.send_password_reset_email(email.email, background_tasks)
        return {"message": "Password reset email sent successfully"}
    except AuthError as e:
        logger.error(f"Failed to send reset password email: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(reset_password: ResetPassword, service: UserService = Depends(get_user_service)):
    try:
        service.reset_password(reset_password.token, reset_password.new_password)
        return {"message": "Password reset successfully"}
    except AuthError as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))