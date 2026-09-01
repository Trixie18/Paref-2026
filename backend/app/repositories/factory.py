from functools import lru_cache

from app.core.config import get_settings
from app.repositories.base import Repository


@lru_cache
def get_repository() -> Repository:
    """Single process-wide repository instance, chosen by REPOSITORY_BACKEND.

    Cached so the in-memory backend actually holds state across requests,
    and so the Google Sheets client (and its process-wide write lock) is
    only ever constructed once.
    """
    settings = get_settings()
    if settings.REPOSITORY_BACKEND == "google_sheets":
        from app.repositories.google_sheets import GoogleSheetsRepository

        if not settings.GOOGLE_SHEET_ID or not settings.GOOGLE_SERVICE_ACCOUNT:
            raise RuntimeError(
                "REPOSITORY_BACKEND=google_sheets requires GOOGLE_SHEET_ID and "
                "GOOGLE_SERVICE_ACCOUNT to be set."
            )
        return GoogleSheetsRepository(settings.GOOGLE_SHEET_ID, settings.GOOGLE_SERVICE_ACCOUNT)

    from app.repositories.memory import InMemoryRepository

    return InMemoryRepository()
