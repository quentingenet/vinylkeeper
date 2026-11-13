from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Request, Response, Depends, status
from app.schemas.user_schema import (
    UserAuthSchema,
    UserCreate,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    ResetTokenSchema,
    UserMeResponse,
    UserSettingsResponse,
    PasswordChangeSchema,
    PasswordChangeResponse,
    EmailChangeRequest,
    ConfirmEmailRequest,
    ContactMessageRequest,
    CurrencyUpdateRequest,
    ContactMessageResponse,
    LoginResponse,
    RegisterResponse,
    MessageResponse,
    TokenRefreshResponse,
)
from app.services.session_service import SessionService
from app.services.user_service import UserService
from app.utils.auth_utils.auth import (
    create_access_token,
    set_token_cookie,
    generate_csrf_token,
    set_csrf_cookie,
)
from app.core.config_env import settings
from app.deps.deps import get_session_service, get_user_service
from app.core.logging import log_activity
from app.utils.auth_utils.auth import (
    TokenType, bearer_token, decode_refresh_token, get_current_user, get_refresh_user,
)
from app.models.user_model import User
from app.core.exceptions import (
    AccountLockedError,
    AppException,
    TermsNotAcceptedError,
    UserNotFoundError,
)

router = APIRouter()


def set_session_cookies(response: Response, user: User, refresh_token: str) -> None:
    """Fresh access and CSRF cookies for the user's token_version, and the refresh token of the session"""
    access_token = create_access_token(str(user.user_uuid), user.token_version)
    set_token_cookie(response, access_token, TokenType.ACCESS)
    set_token_cookie(response, refresh_token, TokenType.REFRESH)
    set_csrf_cookie(response, generate_csrf_token(), settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60)


async def start_session(
    response: Response, user: User, native: bool, sessions: SessionService, renewing: Optional[dict] = None
) -> dict[str, str]:
    """
    A session for the user. Without `renewing`, a new login opens one. With the payload of the refresh
    token just presented, that session moves on to its next refresh token (see SessionService).
    The browser gets cookies (nothing to add to the body). The native app has no cookie jar to trust:
    it gets its tokens in the body, and no cookie is set.
    """
    client = "native" if native else "web"
    refresh_token = (
        await sessions.rotate(user, renewing, client) if renewing is not None else await sessions.open(user, client)
    )
    if not native:
        set_session_cookies(response, user, refresh_token)
        return {}
    return {
        "access_token": create_access_token(str(user.user_uuid), user.token_version),
        "refresh_token": refresh_token,
    }


@router.post("/auth", response_model=LoginResponse, response_model_exclude_none=True, status_code=status.HTTP_200_OK)
async def login(
    response: Response,
    user_data: UserAuthSchema,
    user_service: UserService = Depends(get_user_service),
    sessions: SessionService = Depends(get_session_service),
) -> LoginResponse:
    user = await user_service.authenticate(user_data.email, user_data.password)
    if not user.is_active:
        raise AccountLockedError()
    if not user.is_accepted_terms:
        raise TermsNotAcceptedError()

    tokens = await start_session(response, user, user_data.client == "native", sessions)
    log_activity(user.username, "logged in")
    return LoginResponse(isLoggedIn=True, **tokens)


@router.post("/register", response_model=RegisterResponse, response_model_exclude_none=True,
             status_code=status.HTTP_201_CREATED)
async def register(
    response: Response,
    new_user: UserCreate,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service),
    sessions: SessionService = Depends(get_session_service),
) -> RegisterResponse:
    user = await user_service.create_user(new_user)
    tokens = await start_session(response, user, new_user.client == "native", sessions)
    log_activity(user.username, "signed up")
    # After the response: a slow or failing SMTP never delays nor fails the registration
    background_tasks.add_task(user_service.send_welcome_email, user)
    user_service.send_new_user_registered_email(user, background_tasks)
    return RegisterResponse(message="User registered successfully", isLoggedIn=True, **tokens)


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def forgot_password(
    data: ForgotPasswordSchema,
    background_tasks: BackgroundTasks,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    await user_service.send_password_reset_email(data.email, background_tasks)
    return MessageResponse(message="If an account exists with this email, a password reset link has been sent")


@router.post("/reset-password/check", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def check_reset_token(
    data: ResetTokenSchema,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    """Whether the link of a reset email still works, so the page can say so before asking for a password."""
    await user_service.check_reset_token(data.token)
    return MessageResponse(message="Reset link is valid")


@router.post("/reset-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def reset_password(
    data: ResetPasswordSchema,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    await user_service.reset_password(data.token, data.new_password)
    return MessageResponse(message="Password reset successfully")


@router.post("/refresh-token", response_model=TokenRefreshResponse, response_model_exclude_none=True,
             status_code=status.HTTP_200_OK)
async def refresh_token(
    request: Request,
    response: Response,
    user: User = Depends(get_refresh_user),
    user_service: UserService = Depends(get_user_service),
    sessions: SessionService = Depends(get_session_service),
) -> TokenRefreshResponse:
    """
    The browser sends its refresh cookie. The native app sends its refresh token as a Bearer. Either way
    the response carries the next refresh token: the one just used is good for a minute more, no longer.
    """
    tokens = await start_session(
        response, user, bearer_token(request) is not None, sessions, renewing=decode_refresh_token(request))
    # A visit too: the user is back without the login form
    await user_service.mark_seen(user)
    return TokenRefreshResponse(message="Tokens refreshed", isLoggedIn=True, **tokens)


@router.post("/logout", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    sessions: SessionService = Depends(get_session_service),
) -> MessageResponse:
    # This device's session ends for good, not only its cookies. A request without a valid refresh
    # token (already logged out, expired) has no session to end: logging out works anyway.
    try:
        await sessions.revoke(decode_refresh_token(request))
    except AppException:
        pass
    set_token_cookie(response, "", TokenType.ACCESS, custom_max_age=0)
    set_token_cookie(response, "", TokenType.REFRESH, custom_max_age=0)
    set_csrf_cookie(response, "", max_age=0)
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserMeResponse)
async def get_current_user_info(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user information"""
    user_me_data = await user_service.get_user_me(current_user)
    return user_me_data


@router.get("/me/settings", response_model=UserSettingsResponse)
async def get_current_user_settings(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get current user settings information"""
    user_settings_data = await user_service.get_user_settings(current_user)
    return user_settings_data


@router.put("/me/currency", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def set_my_currency(
    currency_data: CurrencyUpdateRequest,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    """Currency the collection value is shown in."""
    await user_service.set_preferred_currency(current_user, currency_data.currency)
    return MessageResponse(message=f"Collection value shown in {currency_data.currency}")


@router.put("/me/password", response_model=PasswordChangeResponse, response_model_exclude_none=True,
            status_code=status.HTTP_200_OK)
async def change_my_password(
    request: Request,
    response: Response,
    password_data: PasswordChangeSchema,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
    sessions: SessionService = Depends(get_session_service),
) -> PasswordChangeResponse:
    await user_service.change_password(
        current_user,
        password_data.current_password,
        password_data.new_password
    )
    log_activity(current_user.username, "changed their password")
    # Other sessions are revoked; this one gets tokens for the new token_version
    tokens = await start_session(response, current_user, bearer_token(request) is not None, sessions)
    return PasswordChangeResponse(message="Password changed successfully", **tokens)


@router.post("/confirm-email", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def confirm_email(
    data: ConfirmEmailRequest,
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    """Apply a confirmation link (registration or email change). No session needed."""
    await user_service.confirm_email(data.token)
    return MessageResponse(message="Email address confirmed")


@router.post("/me/confirm-email/resend", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def resend_email_confirmation(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    if not await user_service.resend_email_confirmation(current_user):
        return MessageResponse(message="Your email address is already confirmed")
    return MessageResponse(message="A confirmation link has been sent to your email address")


@router.post("/me/email", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def request_email_change(
    data: EmailChangeRequest,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> MessageResponse:
    """The email changes once the link sent to the new address is opened. The username never changes."""
    await user_service.request_email_change(current_user, data.new_email, data.current_password)
    return MessageResponse(message="A confirmation link has been sent to your new email address")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Delete current user account"""
    success = await user_service.delete_user(current_user)
    if not success:
        raise UserNotFoundError(str(current_user.user_uuid))
    log_activity(current_user.username, "deleted their account")


@router.post("/contact", response_model=ContactMessageResponse, status_code=status.HTTP_200_OK)
async def send_contact_message(
    message_data: ContactMessageRequest,
    current_user=Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> ContactMessageResponse:
    return await user_service.send_contact_message(current_user, message_data)
