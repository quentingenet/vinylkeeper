from fastapi import Request
from api.utils.auth_utils.auth import verify_token
from api.core.exceptions import UnauthorizedError

async def verify_auth_token(request: Request):
    try:
        user_uuid = verify_token(request)
    except ValueError as e:
        raise UnauthorizedError("Invalid or missing token") from e
    return user_uuid
