from fastapi import APIRouter, Response, Depends, BackgroundTasks, status, Query, HTTPException, Request
from app.schemas.user_schema import (
    UserAuthSchema,
    UserCreate,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    UserMeResponse,
    UserSettingsResponse,
    UserResponse,
    UserDetailResponse,
    UserUpdate,
    PasswordChangeSchema,
    ContactMessageRequest,
    ContactMessageResponse
)
from app.services.user_service import UserService
from app.utils.auth_utils.auth import create_token, set_token_cookie
from app.deps.deps import get_user_service
from app.core.logging import logger
from app.utils.auth_utils.auth import TokenType, get_current_user
from app.utils.auth_utils.auth import verify_refresh_token
from app.core.exceptions import (
    AccountLockedError,
    TermsNotAcceptedError,
    RefreshTokenNotFoundError,
    InvalidCredentialsError,
    EmailNotFoundError,
    UserNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError,
    PasswordUpdateError,
    AppException
)
from app.core.enums import RoleEnum
from app.core.config_env import settings

router = APIRouter()


@router.post("/auth", status_code=status.HTTP_200_OK)
def login(
    response: Response,
    user_data: UserAuthSchema,
    user_service: UserService = Depends(get_user_service)
):
    """Authenticate user and return tokens"""
    try:
        user = user_service.authenticate(user_data.email, user_data.password)
        if not user.is_active:
            raise AccountLockedError()
        if not user.is_accepted_terms:
            raise TermsNotAcceptedError()

        access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
        refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        set_token_cookie(response, refresh_token, TokenType.REFRESH)
        logger.warning(f"User logged in: {user.username} - {user.email}")
        return {"isLoggedIn": True}
    except (InvalidCredentialsError, EmailNotFoundError) as e:
        raise
    except (AccountLockedError, TermsNotAcceptedError) as e:
        raise


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    response: Response,
    new_user: UserCreate,
    user_service: UserService = Depends(get_user_service)
):
    """Register a new user"""
    try:
        user = user_service.create_user(new_user)
        access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
        refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        set_token_cookie(response, refresh_token, TokenType.REFRESH)
        logger.warning(f"New user registered: {user.username} - {user.email}")
        
        # Send email to ADMIN if in development mode or user is superuser
        if settings.APP_ENV == "development" or (user.role.name == RoleEnum.ADMIN.value and user.is_superuser):
            pass
        else:
            try:
                user_service.send_new_user_registered_email(user)
            except Exception as e:
                logger.error(f"Failed to send registered email to ADMIN for user {user.username}: {e}")
        return {"message": "User registered successfully", "isLoggedIn": True}
    except (DuplicateEmailError, DuplicateUsernameError) as e:
        raise


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    data: ForgotPasswordSchema,
    user_service: UserService = Depends(get_user_service)
):
    """Send password reset email"""
    try:
        user_service.send_password_reset_email(data.email)
        return {"message": "If an account exists with this email, a password reset link has been sent"}
    except Exception as e:
        logger.error(f"Failed to send password reset email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to send password reset email"}
        )


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    data: ResetPasswordSchema,
    user_service: UserService = Depends(get_user_service)
):
    """Reset user password"""
    try:
        user_service.reset_password(data.token, data.new_password)
        return {"message": "Password reset successfully"}
    except (UserNotFoundError, PasswordUpdateError) as e:
        logger.warning(f"Password reset failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": str(e)}
        )


@router.post("/refresh-token", status_code=status.HTTP_200_OK)
def refresh_token(response: Response, request: Request):
    """Refresh access and refresh tokens"""
    try:
        user_uuid = verify_refresh_token(request)
        access_token = create_token(user_uuid, TokenType.ACCESS)
        refresh_token = create_token(user_uuid, TokenType.REFRESH)
        set_token_cookie(response, access_token, TokenType.ACCESS)
        set_token_cookie(response, refresh_token, TokenType.REFRESH)
        return {"message": "Tokens refreshed", "isLoggedIn": True}
    except RefreshTokenNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Refresh token not found"}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid refresh token"}
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    """Logout user by clearing cookies"""
    set_token_cookie(response, "", TokenType.ACCESS, custom_max_age=0)
    set_token_cookie(response, "", TokenType.REFRESH, custom_max_age=0)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserMeResponse)
def get_current_user_info(
    user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user information"""
    try:
        # Get user with calculated counts and dates - secure version
        user_me_data = user_service.get_user_me(user.id)
        return user_me_data
    except Exception as e:
        logger.error(f"Failed to get current user info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to get user information"}
        )


@router.get("/me/settings", response_model=UserSettingsResponse)
def get_current_user_settings(
    user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user settings information"""
    try:
        # Get user with settings data - complete version for settings page
        user_settings_data = user_service.get_user_settings(user.id)
        return user_settings_data
    except Exception as e:
        logger.error(f"Failed to get current user settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to get user settings"}
        )


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Update current user information"""
    try:
        user = user_service.update_user(current_user.id, user_data)
        return UserResponse.model_validate(current_user).model_dump()
    except (UserNotFoundError, DuplicateEmailError, DuplicateUsernameError) as e:
        logger.warning(f"User update failed for {current_user.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": str(e)}
        )
    except Exception as e:
        logger.error(f"Failed to update user {current_user.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to update user"}
        )


@router.put("/me/password", status_code=status.HTTP_200_OK)
def change_my_password(
    password_data: PasswordChangeSchema,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Change current user password"""
    try:
        user_service.change_password(current_user.id, password_data.current_password, password_data.new_password)
        return {"message": "Password changed successfully"}
    except (InvalidCredentialsError, PasswordUpdateError) as e:
        logger.warning(f"Password change failed for user {current_user.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": str(e)}
        )


@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_my_account(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Delete current user account"""
    try:
        user_service.delete_user(current_user.id)
        return {"message": "Account deleted successfully"}
    except UserNotFoundError as e:
        logger.warning(f"Account deletion failed for user {current_user.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(e)}
        )


@router.post("/contact", status_code=status.HTTP_200_OK)
def send_contact_message(
    message_data: ContactMessageRequest,
    user=Depends(get_current_user),
    service: UserService = Depends(get_user_service)
):
    """Send contact message from authenticated user"""
    try:
        result = service.send_contact_message(str(user.user_uuid), message_data)
        return ContactMessageResponse.model_validate(result).model_dump()
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error sending contact message: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
