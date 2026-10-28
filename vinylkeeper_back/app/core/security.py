import asyncio

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.core.config_env import settings
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError


def configure_cors(app: FastAPI):
    origins = [origin.strip()
               for origin in settings.ALLOWED_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "Accept",
            "Origin",
            "X-Requested-With",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "Cookie",
            "X-CSRF-Token"
        ],
        expose_headers=[
            "Content-Type",
            "Authorization",
            "Set-Cookie"
        ],
        max_age=3600,
    )


ph = PasswordHasher()


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(hashed_password: str, plain_password: str) -> bool:
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False


# Argon2 is deliberately slow and CPU bound: from async code, run it in a thread so the
# event loop keeps serving the worker's other requests meanwhile.
async def hash_password_async(password: str) -> str:
    return await asyncio.to_thread(hash_password, password)


async def verify_password_async(hashed_password: str, plain_password: str) -> bool:
    return await asyncio.to_thread(verify_password, hashed_password, plain_password)
