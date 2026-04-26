from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_env: str = "development"
    app_secret_key: str = "change-me-in-production"
    cors_origins: str = "http://localhost:3000,http://localhost:8080"

    # Database
    database_url: str = "postgresql+asyncpg://app:password@localhost:5432/helpmyappliances"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # EURI API
    euri_api_key: str = ""
    euri_api_base_url: str = "https://api.euron.one/api/v1/euri"

    # Dev auth — set DEV_AUTH=true to skip Firebase entirely (local dev only)
    dev_auth: bool = False

    # Firebase
    firebase_project_id: str = "helpmyappliances"

    # Google Cloud Storage
    gcs_bucket_name: str = "helpmyappliances-uploads"
    google_cloud_project: str = "helpmyappliances"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_monthly: str = ""
    stripe_price_id_yearly: str = ""

    # YouTube
    youtube_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
