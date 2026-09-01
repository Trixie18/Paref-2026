"""Thin, generic wrapper around a single gspread Worksheet.

This is the only module that talks to the Google Sheets API directly.
GoogleSheetsRepository builds on top of SheetTable for each worksheet and
handles the mapping to/from domain models; SheetTable itself only knows
about rows of strings.

Concurrency note: Google Sheets has no row-level locking or transactions.
SheetTable serializes all writes through a single process-wide lock, which
prevents two threads *within this one backend process* from corrupting a
row at the same time. It does NOT protect against two separate backend
processes (e.g. two `uvicorn` workers, or a second deploy) writing at once.
For this MVP that's an accepted limitation — see the README for the
mitigation (run a single worker) and the upgrade path (move to Postgres).
"""

import logging
import threading
import time
from datetime import date, datetime
from typing import Any, Callable, Optional, TypeVar

import gspread

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Google's default Sheets API quota is 60 write requests per minute per
# user — trivial to exceed with a burst of calls (bulk-seeding demo data,
# or several checkouts landing close together), since every create/update
# here is its own API call rather than a batch. Retrying with backoff lets
# a caller just wait it out instead of crashing; this is the only retry
# logic in the module, so every write (and, cheaply, every read) goes
# through it.
_RETRY_MAX_ATTEMPTS = 4
_RETRY_BASE_DELAY_SECONDS = 15.0


def _is_rate_limit_error(exc: gspread.exceptions.APIError) -> bool:
    response = getattr(exc, "response", None)
    return response is not None and getattr(response, "status_code", None) == 429


def _with_retry(fn: Callable[[], T]) -> T:
    attempt = 0
    while True:
        try:
            return fn()
        except gspread.exceptions.APIError as exc:
            attempt += 1
            if not _is_rate_limit_error(exc) or attempt >= _RETRY_MAX_ATTEMPTS:
                raise
            delay = _RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            logger.warning(
                "Google Sheets write quota hit; retrying in %.0fs (attempt %d/%d)",
                delay, attempt, _RETRY_MAX_ATTEMPTS,
            )
            time.sleep(delay)


def serialize_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


#  A live Sheets API read is a real network round trip (roughly a few
#  hundred ms) — a single page like the admin dashboard easily needs
#  6-8 of them if every repository call re-reads its sheet from scratch,
#  which was measurably slow (2-3s just for the dashboard). Caching the
#  raw values per table, invalidated the instant this process writes to
#  that same table, removes that cost for same-process traffic without
#  any risk to the inventory check-then-write in
#  inventory_service.validate_and_reserve — that function reads then
#  writes to the same table inside one critical section, so the read is
#  always fresh relative to this process's own prior writes. The TTL is
#  only a safety net for the case nothing here has caused an invalidation
#  in a while (e.g. a sheet someone else is editing by hand).
_CACHE_TTL_SECONDS = 30.0


class SheetTable:
    def __init__(self, worksheet: "gspread.Worksheet", columns: list[str]):
        self._ws = worksheet
        self._columns = columns
        self._lock = threading.RLock()
        self._cached_values: Optional[list[list[str]]] = None
        self._cached_at: float = 0.0

    @property
    def columns(self) -> list[str]:
        return list(self._columns)

    def _invalidate(self) -> None:
        self._cached_values = None

    def _get_values(self) -> list[list[str]]:
        with self._lock:
            fresh_enough = self._cached_values is not None and (time.monotonic() - self._cached_at) < _CACHE_TTL_SECONDS
            if not fresh_enough:
                self._cached_values = _with_retry(self._ws.get_all_values)
                self._cached_at = time.monotonic()
            return self._cached_values

    def all_rows(self) -> list[dict[str, str]]:
        """Returns every data row (header excluded) as {column: raw string}."""
        values = self._get_values()
        if not values:
            return []
        header = values[0]
        missing = [c for c in self._columns if c not in header]
        if missing:
            raise RuntimeError(
                f"Sheet '{self._ws.title}' row 1 doesn't look like its header — missing "
                f"column(s) {missing}. Found row 1: {header!r}. The header row was likely "
                f"overwritten or deleted (e.g. by editing/sorting the sheet manually). Fix "
                f"row 1 to read exactly: {self._columns!r} (column order doesn't matter, "
                f"names do)."
            )
        rows = []
        for raw in values[1:]:
            if not any(cell.strip() for cell in raw):
                continue
            padded = raw + [""] * (len(header) - len(raw))
            rows.append(dict(zip(header, padded)))
        return rows

    def find_row_number(self, id_column: str, id_value: str) -> Optional[int]:
        """1-based sheet row number (including header) for the row whose
        id_column matches id_value, or None if not found."""
        values = self._get_values()
        if not values:
            return None
        header = values[0]
        try:
            col_index = header.index(id_column)
        except ValueError:
            return None
        for i, raw in enumerate(values[1:], start=2):
            if len(raw) > col_index and raw[col_index] == id_value:
                return i
        return None

    def append_row(self, row: dict[str, Any]) -> None:
        values = [serialize_value(row.get(col, "")) for col in self._columns]
        with self._lock:
            _with_retry(lambda: self._ws.append_row(values, value_input_option="RAW"))
            self._invalidate()

    def update_row(self, row_number: int, row: dict[str, Any]) -> None:
        values = [serialize_value(row.get(col, "")) for col in self._columns]
        end_col = gspread.utils.rowcol_to_a1(1, len(self._columns)).rstrip("0123456789")
        with self._lock:
            _with_retry(
                lambda: self._ws.update(f"A{row_number}:{end_col}{row_number}", [values], value_input_option="RAW")
            )
            self._invalidate()

    def clear_data_rows(self) -> None:
        """Deletes every row except the header. Used by seed/clear_google_sheet.py
        to reset a spreadsheet before re-seeding — never called by the app itself.

        Explicitly rewrites the header after truncating rather than trusting
        resize() alone to preserve row 1's content — it doesn't reliably:
        shrinking a sheet to 1 row can wipe that row too, silently turning
        the next data row into a fake "header" and corrupting every ID
        generated afterward (every row.get(id_column) then misses, and
        _next_sequential_id sees no real data at all)."""
        with self._lock:
            _with_retry(lambda: self._ws.resize(rows=1))
            _with_retry(lambda: self._ws.update("A1", [self._columns], value_input_option="RAW"))
            _with_retry(lambda: self._ws.resize(rows=1000))
            self._invalidate()


def open_spreadsheet(sheet_id: str, service_account_path: str) -> "gspread.Spreadsheet":
    gc = gspread.service_account(filename=service_account_path)
    return gc.open_by_key(sheet_id)


def get_or_create_worksheet(spreadsheet: "gspread.Spreadsheet", title: str, columns: list[str]) -> "gspread.Worksheet":
    try:
        ws = spreadsheet.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=title, rows=1000, cols=max(len(columns), 10))
        _with_retry(lambda: ws.append_row(columns, value_input_option="RAW"))
        return ws
    values = _with_retry(ws.get_all_values)
    if not values:
        _with_retry(lambda: ws.append_row(columns, value_input_option="RAW"))
    return ws
