from datetime import datetime, timedelta, timezone
from enum import Enum
from jose import jwt, JWTError
from vinylkeeper_back.core.config_env import Settings   
import os

base_path = "./keys"
public_key_path = os.path.join(base_path, "public_key.pem")
private_key_path = os.path.join(base_path, "private_key.pem")

with open(public_key_path, "rb") as key_file:
    PUBLIC_KEY = key_file.read()

with open(private_key_path, "rb") as key_file:
    PRIVATE_KEY = key_file.read()

ALGORITHM = Settings().ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Settings().ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_MINUTES = Settings().REFRESH_TOKEN_EXPIRE_MINUTES

class TokenType(Enum):
    ACCESS = "access"
    REFRESH = "refresh"

def create_token(user_uuid: str, token_type: TokenType) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {"sub": user_uuid, "exp": expire}
    if token_type == TokenType.ACCESS:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    elif token_type == TokenType.REFRESH:
        expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, PRIVATE_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])
        user_uuid: str = payload.get("sub")
        if user_uuid is None or user_uuid == "":
            raise ValueError("Invalid token")
        return user_uuid
    except JWTError:
        raise ValueError("Invalid token")
