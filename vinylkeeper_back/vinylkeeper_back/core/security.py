from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from vinylkeeper_back.core.config_env import Settings
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

def configure_cors(app: FastAPI):
    origins = Settings().ALLOWED_ORIGINS.split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
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