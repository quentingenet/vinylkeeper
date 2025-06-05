from fastapi import APIRouter, Response, Depends, BackgroundTasks, status
from app.schemas.user_schema import UserAuthSchema, UserCreate, ForgotPasswordSchema, ResetPasswordSchema, UserMeResponse
from app.services.user_service import UserService
from app.utils.auth_utils.auth import create_token, set_token_cookie
from app.deps.deps import get_user_service
from app.core.logging import logger
from app.utils.auth_utils.auth import TokenType, get_current_user
from app.utils.auth_utils.auth import verify_refresh_token
from app.core.exceptions import (
    AccountLockedError,
    TermsNotAcceptedError,
    RefreshTokenNotFoundError
)

router = APIRouter()


@router.post("/auth", status_code=status.HTTP_200_OK)
def login(
    response: Response,
    user_data: UserAuthSchema,
    user_service: UserService = Depends(get_user_service)
):
    user = user_service.authenticate(user_data.email, user_data.password)
    if not user.is_active:
        raise AccountLockedError()
    if not user.is_accepted_terms:
        raise TermsNotAcceptedError()

    access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
    refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, refresh_token, TokenType.REFRESH)
    logger.info(f"User logged in: {user.username} - {user.email}")
    return {"isLoggedIn": True}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    response: Response,
    new_user: UserCreate,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
):
    user = user_service.create_user(new_user)
    access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
    refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, refresh_token, TokenType.REFRESH)
    logger.info(f"New user registered: {user.username} - {user.email}")
    return {"message": "User registered successfully", "isLoggedIn": True}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    data: ForgotPasswordSchema,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
):
    user_service.send_password_reset_email(data.email, background_tasks)
    logger.info(f"Password reset email sent to {data.email}")
    return {"message": "If an account exists with this email, a password reset link has been sent"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    data: ResetPasswordSchema,
    user_service: UserService = Depends(get_user_service)
):
    user_service.reset_password(data.token, data.new_password)
    logger.info("Password reset successfully")
    return {"message": "Password reset successfully"}


@router.post("/refresh-token", status_code=status.HTTP_200_OK)
def refresh_token(
    response: Response,
    user_uuid: str = Depends(verify_refresh_token)
):
    try:
        access_token = create_token(user_uuid, TokenType.ACCESS)
        refresh_token = create_token(user_uuid, TokenType.REFRESH)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        set_token_cookie(response, refresh_token, TokenType.REFRESH)
        return {"message": "Tokens refreshed", "isLoggedIn": True}
    except RefreshTokenNotFoundError:
        # If no refresh token, return just an unauthenticated status
        return {"message": "Not authenticated", "isLoggedIn": False}


@router.get("/me", status_code=status.HTTP_200_OK, response_model=UserMeResponse)
def get_current_user_info(
    user=Depends(get_current_user)
):
    return UserMeResponse.model_validate(user)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    set_token_cookie(response, "", TokenType.ACCESS, custom_max_age=0)
    set_token_cookie(response, "", TokenType.REFRESH, custom_max_age=0)
    return {"message": "Logged out successfully"}
