from fastapi import APIRouter, BackgroundTasks, Response, Depends, status
from app.schemas.user_schema import (
    UserAuthSchema,
    UserCreate,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    UserMeResponse,
    UserSettingsResponse,
    PasswordChangeSchema,
    EmailChangeRequest,
    ConfirmEmailRequest,
    ContactMessageRequest,
    ContactMessageResponse,
    LoginResponse,
    RegisterResponse,
    MessageResponse,
    TokenRefreshResponse,
)
from app.services.user_service import UserService
from app.utils.auth_utils.auth import (
    create_token,
    set_token_cookie,
    generate_csrf_token,
    set_csrf_cookie,
)
from app.core.config_env import settings
from app.deps.deps import get_user_service
from app.core.logging import logger
from app.utils.auth_utils.auth import TokenType, get_current_user, get_refresh_user
from app.models.user_model import User
from app.core.exceptions import (
    AccountLockedError,
    TermsNotAcceptedError,
    UserNotFoundError,
)
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


def set_session_cookies(response: Response, user: User) -> None:
    """Issue fresh access, refresh and CSRF cookies for the user's current token_version"""
    access_token = create_token(str(user.user_uuid), TokenType.ACCESS, user.token_version)
    refresh_token = create_token(str(user.user_uuid), TokenType.REFRESH, user.token_version)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, refresh_token, TokenType.REFRESH)
    set_csrf_cookie(response, generate_csrf_token(), settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60)


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

    set_session_cookies(response, user)
    logger.info(f"User logged in: {user.username}")
    return LoginResponse(isLoggedIn=True)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@handle_app_exceptions
async def register(
    response: Response,
    new_user: UserCreate,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
) -> RegisterResponse:
    user = await user_service.create_user(new_user)
    set_session_cookies(response, user)
    logger.info(f"New user registered: {user.username}")
    # After the response: a slow or failing SMTP never delays nor fails the registration
    background_tasks.add_task(user_service.send_welcome_email, user)
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
async def refresh_token(
    response: Response,
    user: User = Depends(get_refresh_user),
    user_service: UserService = Depends(get_user_service)
) -> TokenRefreshResponse:
    set_session_cookies(response, user)
    # A visit too: the user is back without the login form
    await user_service.mark_seen(user)
    return TokenRefreshResponse(message="Tokens refreshed", isLoggedIn=True)


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def logout(response: Response) -> MessageResponse:
    set_token_cookie(response, "", TokenType.ACCESS, custom_max_age=0)
    set_token_cookie(response, "", TokenType.REFRESH, custom_max_age=0)
    set_csrf_cookie(response, "", max_age=0)
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


@router.put("/me/password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def change_my_password(
    response: Response,
    password_data: PasswordChangeSchema,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    await user_service.change_password(
        current_user,
        password_data.current_password,
        password_data.new_password
    )
    # Other sessions are revoked; this one gets tokens for the new token_version
    set_session_cookies(response, current_user)
    return MessageResponse(message="Password changed successfully")


@router.post("/confirm-email", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def confirm_email(
    data: ConfirmEmailRequest,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    """Apply a confirmation link (registration or email change). No session needed."""
    await user_service.confirm_email(data.token)
    return MessageResponse(message="Email address confirmed")


@router.post("/me/confirm-email/resend", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def resend_email_confirmation(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    if not await user_service.resend_email_confirmation(current_user):
        return MessageResponse(message="Your email address is already confirmed")
    return MessageResponse(message="A confirmation link has been sent to your email address")


@router.post("/me/email", response_model=MessageResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def request_email_change(
    data: EmailChangeRequest,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    """The email changes once the link sent to the new address is opened. The username never changes."""
    await user_service.request_email_change(current_user, data.new_email, data.current_password)
    return MessageResponse(message="A confirmation link has been sent to your new email address")


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
