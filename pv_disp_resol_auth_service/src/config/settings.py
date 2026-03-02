from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────────────
    APP_NAME: str    = "Dispute Management API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool      = False
    ENVIRONMENT: str = "development"   # development | staging | production

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/dispute_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ── JWT Access Token ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str                            # openssl rand -hex 32
    JWT_ALGORITHM: str                   = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ── JWT Refresh Token ──────────────────────────────────────────────────
    JWT_REFRESH_SECRET_KEY: str                    # separate secret
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int   = 7

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
