import os

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    # Confirmation links of the registration and email change emails (a default: no .env change needed)
    EMAIL_TOKEN_EXPIRE_MINUTES: int = 2880
    ALGORITHM: str
    COOKIE_DOMAIN: str
    CSRF_ENFORCE: bool = True

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
    # "Connect with Discogs" (OAuth 1.0a): the application registered on Discogs, the key that
    # encrypts the users' tokens (Fernet), and where Discogs sends the user back. Empty: the
    # connection is disabled, the rest of the app works.
    DISCOGS_CONSUMER_KEY: str = ""
    DISCOGS_CONSUMER_SECRET: str = ""
    DISCOGS_TOKEN_KEY: str = ""
    DISCOGS_OAUTH_CALLBACK_URL: str = ""
    # Background Discogs enrichment of newly created albums (disabled in tests)
    ALBUM_ENRICHMENT_ENABLED: bool = True

    # User-Agent
    USER_AGENT: str

    model_config = SettingsConfigDict(
        env_file=f"./app/.env.{os.getenv('APP_ENV', 'development')}"
    )


# Init params
settings = Settings()
