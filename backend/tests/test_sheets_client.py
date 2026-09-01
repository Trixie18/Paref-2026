"""Tests for sheets_client.py: the write-quota retry/backoff behavior
around gspread.exceptions.APIError, and the read cache that avoids
re-hitting the Sheets API for every repository call.

These don't touch a real spreadsheet — SheetTable only needs an object
with the handful of gspread.Worksheet methods it actually calls, so a
small fake stands in.
"""

import re
from unittest.mock import patch

import gspread
import pytest

from app.repositories.sheets_client import SheetTable, _with_retry


class FakeResponse:
    def __init__(self, status_code: int, message: str = "error"):
        self.status_code = status_code
        self._message = message

    def json(self):
        return {"error": {"code": self.status_code, "message": self._message, "status": "x"}}


def rate_limit_error() -> gspread.exceptions.APIError:
    return gspread.exceptions.APIError(FakeResponse(429, "Quota exceeded"))


def not_found_error() -> gspread.exceptions.APIError:
    return gspread.exceptions.APIError(FakeResponse(404, "Not found"))


@patch("app.repositories.sheets_client.time.sleep")
def test_with_retry_succeeds_immediately_when_no_error(mock_sleep):
    assert _with_retry(lambda: "ok") == "ok"
    mock_sleep.assert_not_called()


@patch("app.repositories.sheets_client.time.sleep")
def test_with_retry_retries_on_429_then_succeeds(mock_sleep):
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise rate_limit_error()
        return "eventually ok"

    assert _with_retry(flaky) == "eventually ok"
    assert calls["n"] == 3
    assert mock_sleep.call_count == 2


@patch("app.repositories.sheets_client.time.sleep")
def test_with_retry_gives_up_after_max_attempts(mock_sleep):
    def always_rate_limited():
        raise rate_limit_error()

    with pytest.raises(gspread.exceptions.APIError):
        _with_retry(always_rate_limited)
    assert mock_sleep.call_count == 3  # backs off 3 times before the 4th attempt fails for good


@patch("app.repositories.sheets_client.time.sleep")
def test_with_retry_does_not_retry_non_rate_limit_errors(mock_sleep):
    def always_404():
        raise not_found_error()

    with pytest.raises(gspread.exceptions.APIError):
        _with_retry(always_404)
    mock_sleep.assert_not_called()


class FakeWorksheet:
    """Minimal stand-in for gspread.Worksheet: raises 429 on the first
    append_row call, then succeeds, so SheetTable.append_row exercises the
    same retry path through its real call site."""

    title = "Fake"

    def __init__(self):
        self.rows: list[list[str]] = []
        self._fail_next = True

    def append_row(self, values, value_input_option="RAW"):
        if self._fail_next:
            self._fail_next = False
            raise rate_limit_error()
        self.rows.append(values)

    def get_all_values(self):
        return [["a", "b"]] + self.rows


@patch("app.repositories.sheets_client.time.sleep")
def test_sheet_table_append_row_recovers_from_quota_error(mock_sleep):
    ws = FakeWorksheet()
    table = SheetTable(ws, ["a", "b"])

    table.append_row({"a": "1", "b": "2"})

    assert ws.rows == [["1", "2"]]
    mock_sleep.assert_called_once()


class StaticWorksheet:
    title = "Users"

    def __init__(self, rows: list[list[str]]):
        self._rows = rows

    def get_all_values(self):
        return self._rows


def test_all_rows_raises_a_clear_error_when_the_header_row_is_missing():
    # Row 1 is actual data (no "user_id" column present) — exactly what
    # happened when clear_data_rows() used to lose the header row.
    ws = StaticWorksheet([["USR-000001", "dev-parent-1", "Maria", "maria@example.test", "0917", "2026-01-01", "TRUE"]])
    table = SheetTable(ws, ["user_id", "firebase_uid", "name", "email", "phone", "created_at", "active"])

    with pytest.raises(RuntimeError, match="doesn't look like its header"):
        table.all_rows()


def test_all_rows_tolerates_reordered_but_complete_header():
    ws = StaticWorksheet([["b", "a"], ["2", "1"]])
    table = SheetTable(ws, ["a", "b"])

    assert table.all_rows() == [{"a": "1", "b": "2"}]


class CountingWorksheet:
    """Tracks how many times get_all_values() actually hits the API, so
    caching behavior can be asserted without a real spreadsheet."""

    title = "Counting"

    def __init__(self, rows: list[list[str]]):
        self.rows = rows
        self.read_count = 0

    def get_all_values(self):
        self.read_count += 1
        return self.rows

    def append_row(self, values, value_input_option="RAW"):
        self.rows.append(values)


@patch("app.repositories.sheets_client.time.sleep")
def test_repeated_reads_are_served_from_cache(mock_sleep):
    ws = CountingWorksheet([["a", "b"], ["1", "2"]])
    table = SheetTable(ws, ["a", "b"])

    table.all_rows()
    table.all_rows()
    table.find_row_number("a", "1")

    assert ws.read_count == 1


@patch("app.repositories.sheets_client.time.sleep")
def test_write_invalidates_the_cache(mock_sleep):
    ws = CountingWorksheet([["a", "b"]])
    table = SheetTable(ws, ["a", "b"])

    table.all_rows()
    assert ws.read_count == 1

    table.append_row({"a": "1", "b": "2"})
    table.all_rows()

    assert ws.read_count == 2


@patch("app.repositories.sheets_client.time.monotonic")
def test_cache_expires_after_ttl(mock_monotonic):
    ws = CountingWorksheet([["a", "b"], ["1", "2"]])
    table = SheetTable(ws, ["a", "b"])

    mock_monotonic.return_value = 1000.0
    table.all_rows()
    assert ws.read_count == 1

    mock_monotonic.return_value = 1000.0 + 5  # well within the TTL
    table.all_rows()
    assert ws.read_count == 1

    mock_monotonic.return_value = 1000.0 + 31  # past the TTL
    table.all_rows()
    assert ws.read_count == 2


class StatefulWorksheet:
    """A fake gspread.Worksheet that actually stores rows (including
    blanks), so tests can drive realistic sequences of append/update/read
    the way SheetTable's callers do, and inspect the resulting sheet
    exactly as a human opening the real spreadsheet would see it."""

    title = "Fake"

    def __init__(self, header):
        self.rows = [list(header)]

    def get_all_values(self):
        return [list(r) for r in self.rows]

    def append_row(self, values, value_input_option="RAW"):
        self.rows.append(list(values))

    def update(self, range_name, values, value_input_option="RAW"):
        row_number = int(re.match(r"[A-Z]+(\d+):", range_name).group(1))
        while len(self.rows) < row_number:
            self.rows.append([""] * len(self.rows[0]))
        self.rows[row_number - 1] = list(values[0])


@patch("app.repositories.sheets_client.time.sleep")
def test_find_row_numbers_is_correct_even_with_blank_rows_earlier_in_the_sheet(mock_sleep):
    # Regression test for a real bug: replacing a bundle's items blanks out
    # its old rows (rather than deleting them) rather than shifting every
    # row below up. A second bundle's edit must still find the *physical*
    # row of its own items, not a position computed from the filtered
    # (blank-skipping) list all_rows() returns - that mismatch was
    # silently updating/blanking the wrong row, which left old rows
    # un-cleared (so items duplicated) while new rows were still appended.
    ws = StatefulWorksheet(["bundle_id", "product_id", "quantity"])
    table = SheetTable(ws, ["bundle_id", "product_id", "quantity"])

    def set_items(bundle_id, items):
        for row_number in table.find_row_numbers({"bundle_id": bundle_id}):
            table.update_row(row_number, {"bundle_id": "", "product_id": "", "quantity": ""})
        for product_id, qty in items:
            table.append_row({"bundle_id": bundle_id, "product_id": product_id, "quantity": qty})

    set_items("BUNDLE-1", [("MEAL", 1), ("WATER", 1)])
    set_items("BUNDLE-2", [("MEAL", 1), ("WATER", 1), ("RAFFLE", 1)])

    # Editing BUNDLE-1 blanks its two rows (rows 2-3), leaving a gap before
    # BUNDLE-2's rows - exactly the condition that broke row-number math.
    set_items("BUNDLE-1", [("MEAL", 2)])

    def active_rows_for(bundle_id):
        return [r for r in table.all_rows() if r["bundle_id"] == bundle_id]

    assert active_rows_for("BUNDLE-1") == [{"bundle_id": "BUNDLE-1", "product_id": "MEAL", "quantity": "2"}]
    assert len(active_rows_for("BUNDLE-2")) == 3, "editing BUNDLE-1 must not touch BUNDLE-2's rows"

    # Edit BUNDLE-1 again - if row numbers were still wrong, this would
    # duplicate rather than replace.
    set_items("BUNDLE-1", [("MEAL", 3), ("WATER", 1)])
    assert sorted(active_rows_for("BUNDLE-1"), key=lambda r: r["product_id"]) == [
        {"bundle_id": "BUNDLE-1", "product_id": "MEAL", "quantity": "3"},
        {"bundle_id": "BUNDLE-1", "product_id": "WATER", "quantity": "1"},
    ]
    assert len(active_rows_for("BUNDLE-2")) == 3
