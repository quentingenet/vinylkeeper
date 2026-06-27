from fastapi import APIRouter, Response, Depends, status, Request
from app.schemas.user_schema import (
    UserAuthSchema,
    UserCreate,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    UserMeResponse,
    UserSettingsResponse,
    UserUpdate,
    PasswordChangeSchema,
    ContactMessageRequest,
    ContactMessageResponse,
    LoginResponse,
    RegisterResponse,
    MessageResponse,
    TokenRefreshResponse,
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
    UserNotFoundError,
)
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.post("/auth", response_model=LoginResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def login(
    response: Response,
    user_data: UserAuthSchema,
    user_service: UserService = Depends(get_user_service)
) -> LoginResponse:
    user = await user_service.authenticate(user_data.email, user_data.password)
    if not user.is_active:
        raise AccountLockedError()
    if not user.is_accepted_terms:
        raise TermsNotAcceptedError()

    access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
    refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, refresh_token, TokenType.REFRESH)
    logger.info(f"User logged in: {user.username}")
    return LoginResponse(isLoggedIn=True)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@handle_app_exceptions
async def register(
    response: Response,
    new_user: UserCreate,
    user_service: UserService = Depends(get_user_service)
) -> RegisterResponse:
    user = await user_service.create_user(new_user)
    access_token = create_token(str(user.user_uuid), TokenType.ACCESS)
    refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, refresh_token, TokenType.REFRESH)
    logger.info(f"New user registered: {user.username}")
    await user_service.send_new_user_registered_email(user)
    return RegisterResponse(message="User registered successfully", isLoggedIn=True)


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def forgot_password(
    data: ForgotPasswordSchema,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    await user_service.send_password_reset_email(data.email)
    return MessageResponse(message="If an account exists with this email, a password reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def reset_password(
    data: ResetPasswordSchema,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    await user_service.reset_password(data.token, data.new_password)
    return MessageResponse(message="Password reset successfully")


@router.post("/refresh-token", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def refresh_token(response: Response, request: Request) -> TokenRefreshResponse:
    user_uuid = verify_refresh_token(request)
    access_token = create_token(user_uuid, TokenType.ACCESS)
    new_refresh_token = create_token(user_uuid, TokenType.REFRESH)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, new_refresh_token, TokenType.REFRESH)
    return TokenRefreshResponse(message="Tokens refreshed", isLoggedIn=True)


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def logout(response: Response) -> MessageResponse:
    set_token_cookie(response, "", TokenType.ACCESS, custom_max_age=0)
    set_token_cookie(response, "", TokenType.REFRESH, custom_max_age=0)
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserMeResponse)
@handle_app_exceptions
async def get_current_user_info(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user information"""
    user_me_data = await user_service.get_user_me(current_user)
    return user_me_data


@router.get("/me/settings", response_model=UserSettingsResponse)
@handle_app_exceptions
async def get_current_user_settings(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user settings information"""
    user_settings_data = await user_service.get_user_settings(current_user)
    return user_settings_data


@router.put("/me", response_model=UserSettingsResponse)
@handle_app_exceptions
async def update_current_user(
    user_data: UserUpdate,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Update current user information"""
    updated_user = await user_service.update_user(current_user, user_data)
    return UserSettingsResponse.model_validate(updated_user)


@router.put("/me/password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def change_my_password(
    password_data: PasswordChangeSchema,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    await user_service.change_password(
        current_user,
        password_data.current_password,
        password_data.new_password
    )
    return MessageResponse(message="Password changed successfully")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
@handle_app_exceptions
async def delete_my_account(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Delete current user account"""
    success = await user_service.delete_user(current_user)
    logger.info(f"User deleted: {current_user.username}")
    if not success:
        raise UserNotFoundError(str(current_user.user_uuid))


@router.post("/contact", response_model=ContactMessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def send_contact_message(
    message_data: ContactMessageRequest,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> ContactMessageResponse:
    return await user_service.send_contact_message(current_user, message_data)
