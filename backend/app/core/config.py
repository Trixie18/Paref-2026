from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Which repository implementation backs the app.
    REPOSITORY_BACKEND: Literal["memory", "google_sheets"] = "memory"

    # Which auth verifier is used. "dev" accepts "Bearer dev:<uid>" tokens and
    # must never be enabled in production.
    AUTH_BACKEND: Literal["firebase", "dev"] = "dev"

    # Google Sheets
    GOOGLE_SHEET_ID: str = ""
    GOOGLE_SERVICE_ACCOUNT: str = ""  # path to service account JSON file

    # Firebase Admin SDK
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_PRIVATE_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    EVENT_YEAR: int = 2026

    # When true and REPOSITORY_BACKEND=memory, main.py populates the
    # in-memory store with development seed data at startup (see
    # seed/seed_data.py). Ignored for the google_sheets backend, where you
    # instead run `python -m seed.seed_data` once to write real rows.
    SEED_ON_STARTUP: bool = False

    # Requests allowed per client IP per rolling minute (see
    # app/core/rate_limit.py). The app and its middleware live for the
    # whole process, so this ceiling is shared across every test in a
    # pytest run too — keep it comfortably above what a full test run or a
    # legitimate burst of frontend traffic would ever produce.
    RATE_LIMIT_PER_MINUTE: int = 600

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
