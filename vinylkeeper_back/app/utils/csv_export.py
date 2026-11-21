"""The CSV files of the exports (collections, wishlist): one format, safe to open in a spreadsheet."""
import csv
import io
from typing import Iterable

from fastapi.responses import StreamingResponse

# A cell that starts with one of them is read as a formula by Excel, LibreOffice or Google Sheets
FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def spreadsheet_safe(value: str) -> str:
    """
    A title typed by a member ("=HYPERLINK(...)") stays text in the spreadsheet, not a formula that runs:
    the apostrophe is the spreadsheets' own mark of a text cell (OWASP, CSV injection).
    """
    return f"'{value}" if value and value.startswith(FORMULA_TRIGGERS) else value


def stream_csv(filename: str, rows: Iterable[list[str]]) -> StreamingResponse:
    """The rows as a CSV file, semicolon separated, with a BOM so that Excel reads it as UTF-8."""
    def generate() -> Iterable[bytes]:
        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=";", quoting=csv.QUOTE_MINIMAL)
        first_chunk = True
        for row in rows:
            buffer.seek(0)
            buffer.truncate(0)
            writer.writerow([spreadsheet_safe(value) for value in row])
            chunk = buffer.getvalue()
            if first_chunk:
                first_chunk = False
                chunk = "﻿" + chunk
            yield chunk.encode("utf-8")

    return StreamingResponse(
        generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
