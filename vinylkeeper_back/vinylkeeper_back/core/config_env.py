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

    # Tokens configuration
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int
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

    class Config:
        env_file = f"../vinylkeeper_back/.env.{os.getenv('APP_ENV', 'development')}"

# Initialiser les paramètres
settings = Settings()
