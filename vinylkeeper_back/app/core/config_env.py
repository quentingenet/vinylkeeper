from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    APP_ENV: str

    # Database configuration
    DATABASE_NAME: str
    DATABASE_HOST: str
    DATABASE_PORT: str
    DATABASE_USERNAME: str
    DATABASE_PASSWORD: str
    DATABASE_URL: str

    # Database pool configuration
    DB_POOL_SIZE: int
    DB_MAX_OVERFLOW: int
    DB_POOL_TIMEOUT: int
    DB_POOL_RECYCLE: int
    DB_STATEMENT_TIMEOUT: int
    DB_LOCK_TIMEOUT: int

    # Tokens configuration
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int
    RESET_TOKEN_EXPIRE_MINUTES: int
    ALGORITHM: str
    COOKIE_DOMAIN: str

    # Mail configuration
    EMAIL_ADMIN: str
    SMTP_PORT: int
    SMTP_SERVER: str
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_ADDRESS: str

    # Frontend URL
    FRONTEND_URL: str

    # Allowed origins
    ALLOWED_ORIGINS: str

    # Default role id
    DEFAULT_ROLE_ID: int

    # external API
    DISCOGS_API_URL: str
    DISCOGS_API_KEY: str

    # User-Agent
    USER_AGENT: str

    class Config:
        env_file = f"./app/.env.{os.getenv('APP_ENV', 'development')}"


# Init params
settings = Settings()
