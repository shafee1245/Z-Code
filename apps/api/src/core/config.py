from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "QR Studio API"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    web_origin: str = ""
    frontend_url: str = ""
    api_base_url: str = ""
    database_url: str = ""
    jwt_secret: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    cors_origins: str = ""

    model_config = SettingsConfigDict(env_file="../../.env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
