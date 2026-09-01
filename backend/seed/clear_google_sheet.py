"""Clears every data row (keeping headers) from every sheet in the
configured Google Spreadsheet. Requires REPOSITORY_BACKEND=google_sheets.

For resetting a partially-seeded spreadsheet — e.g. `python -m
seed.seed_data` was interrupted by a write-quota 429 partway through and
re-running it would duplicate whatever it already wrote — or for wiping
dev data before a fresh reseed. Never run this against a spreadsheet that
holds real event data.

Run with:  python -m seed.clear_google_sheet
Skip the confirmation prompt (e.g. for scripting) with --yes.
"""

import sys

from app.core.config import get_settings
from app.repositories.factory import get_repository
from app.repositories.google_sheets import GoogleSheetsRepository


def main() -> None:
    settings = get_settings()
    if settings.REPOSITORY_BACKEND != "google_sheets":
        print("REPOSITORY_BACKEND is not 'google_sheets' — nothing to clear. Set it in backend/.env first.")
        sys.exit(1)

    repo = get_repository()
    assert isinstance(repo, GoogleSheetsRepository)

    if "--yes" not in sys.argv:
        answer = input(
            f"This will permanently delete ALL data rows (not headers) from every sheet "
            f"in spreadsheet {settings.GOOGLE_SHEET_ID}. Type 'yes' to continue: "
        )
        if answer.strip().lower() != "yes":
            print("Cancelled.")
            sys.exit(0)

    print("Clearing all sheets...")
    repo.clear_all_data()
    print("Done. Every sheet now has just its header row.")


if __name__ == "__main__":
    main()
