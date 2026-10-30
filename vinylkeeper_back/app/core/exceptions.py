from fastapi import status
from typing import Optional, Dict, Any


class ErrorCode:
    # Authentication errors (1000-1999)
    INVALID_CREDENTIALS = 1000
    EMAIL_ALREADY_EXISTS = 1001
    USERNAME_ALREADY_EXISTS = 1002
    ACCOUNT_LOCKED = 1003
    INVALID_TOKEN = 1004
    USER_NOT_FOUND = 1005
    EMAIL_NOT_FOUND = 1006
    PASSWORD_UPDATE_FAILED = 1007
    TERMS_NOT_ACCEPTED = 1008
    REFRESH_TOKEN_NOT_FOUND = 1009

    # Resource errors (2000-2999)
    RESOURCE_NOT_FOUND = 2000
    RESOURCE_ALREADY_EXISTS = 2001
    INVALID_RESOURCE_STATE = 2002

    # Validation errors (3000-3999)
    INVALID_INPUT = 3000
    MISSING_REQUIRED_FIELD = 3001
    INVALID_FORMAT = 3002

    # Authorization errors (4000-4999)
    FORBIDDEN = 4030
    FORBIDDEN_OWNER = 4003
    CSRF_TOKEN_INVALID = 4004
    QUOTA_EXCEEDED = 4290

    # Server errors (5000-5999)
    SERVER_ERROR = 5000
    DATABASE_ERROR = 5001
    EXTERNAL_SERVICE_ERROR = 5002


class AppException(Exception):
    def __init__(
        self,
        error_code: int,
        message: str,
        status_code: int,
        details: Optional[Dict[str, Any]] = None,
        should_log: bool = True
    ):
        self.status_code = status_code
        self.detail = {
            "code": error_code,
            "message": message,
            "details": details or {}
        }
        self.should_log = should_log
        super().__init__(message)


class AuthenticationError(AppException):
    def __init__(
        self, error_code: int, message: str, details: Optional[Dict[str, Any]] = None, should_log: bool = True
    ):
        super().__init__(
            error_code=error_code,
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
            should_log=should_log
        )


class ServerError(AppException):
    def __init__(self, error_code: int, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=error_code,
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class InvalidCredentialsError(AuthenticationError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.INVALID_CREDENTIALS,
            message="Invalid email or password"
        )


class AccountLockedError(AuthenticationError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.ACCOUNT_LOCKED,
            message="Account is disabled"
        )


class TermsNotAcceptedError(AuthenticationError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.TERMS_NOT_ACCEPTED,
            message="Terms and conditions not accepted"
        )


class InvalidResetTokenError(AuthenticationError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.INVALID_TOKEN,
            message="Invalid or expired reset token"
        )


class InvalidEmailTokenError(AppException):
    """400, not 401: the link is opened without a session, and a 401 would trigger a token refresh"""
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.INVALID_TOKEN,
            message="Invalid or expired confirmation link",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class RefreshTokenNotFoundError(AuthenticationError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.REFRESH_TOKEN_NOT_FOUND,
            message="Refresh token not found",
            should_log=False
        )


class PasswordUpdateError(ServerError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.PASSWORD_UPDATE_FAILED,
            message="Failed to update password"
        )


class UserNotFoundError(AuthenticationError):
    def __init__(self, identifier: str = ""):
        super().__init__(
            error_code=ErrorCode.USER_NOT_FOUND,
            message="User not found",
            details={}
        )


class EmailNotFoundError(AuthenticationError):
    def __init__(self, email: str = ""):
        super().__init__(
            error_code=ErrorCode.EMAIL_NOT_FOUND,
            message="Invalid email or password",
            details={}
        )


class ResourceError(AppException):
    def __init__(self, error_code: int, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=error_code,
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class ResourceNotFoundError(ResourceError):
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            message=f"{resource_type} with id {resource_id} not found",
            details={"resource_type": resource_type,
                     "resource_id": resource_id}
        )


class QuotaExceededError(AppException):
    """The user has used up a daily allowance: retry once the oldest use leaves the window."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=ErrorCode.QUOTA_EXCEEDED,
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
            should_log=False,
        )


class ValidationError(AppException):
    def __init__(self, error_code: int, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=error_code,
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class DuplicateFieldError(ValidationError):
    def __init__(self, field: str, value: str):
        super().__init__(
            error_code=ErrorCode.RESOURCE_ALREADY_EXISTS,
            message=f"{field} already exists: {value}",
            details={"field": field, "value": value}
        )


class DuplicateEmailError(DuplicateFieldError):
    def __init__(self, email: str):
        super().__init__(
            field="Email",
            value=email
        )


class DuplicateUsernameError(DuplicateFieldError):
    def __init__(self, username: str):
        super().__init__(
            field="Username",
            value=username
        )


class DuplicateCollectionNameError(DuplicateFieldError):
    def __init__(self, collection_name: str):
        super().__init__(
            field="Collection name",
            value=collection_name
        )


class ForbiddenError(AppException):
    def __init__(
        self,
        error_code: int = ErrorCode.FORBIDDEN,
        message: str = "You are not allowed to access this resource",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            error_code=error_code,
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class UnauthorizedError(AuthenticationError):
    def __init__(self, message: str = "Unauthorized access", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code=ErrorCode.INVALID_TOKEN,
            message=message,
            details=details
        )


class CsrfValidationError(ForbiddenError):
    def __init__(self):
        super().__init__(
            error_code=ErrorCode.CSRF_TOKEN_INVALID,
            message="Invalid or missing CSRF token"
        )
