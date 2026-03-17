from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from typing import Iterable

from fastapi.responses import Response, StreamingResponse
from odf.opendocument import OpenDocumentSpreadsheet
from odf.style import Style, TextProperties
from odf.table import Table, TableCell, TableColumn, TableRow
from odf.text import P

from app.core.logging import logger
from app.models.wishlist_model import Wishlist
from app.repositories.wishlist_repository import WishlistRepository


class WishlistExportService:
    """Service responsible for exporting the current user's wishlist."""

    def __init__(self, wishlist_repository: WishlistRepository) -> None:
        self.wishlist_repository = wishlist_repository

    async def export_my_wishlist_csv(self, user_id: int, username: str) -> StreamingResponse:
        export_kind = "wishlist"
        export_format = "csv"
        logger.info(f"Export requested: kind={export_kind} format={export_format} user_id={user_id}")
        try:
            items = await self.wishlist_repository.get_user_wishlist_all(user_id)
            filename = self._build_filename(username=username, suffix="wishlist.csv")
            rows_count = len(items)

            def row_iter() -> Iterable[list[str]]:
                yield self._headers()
                for item in items:
                    yield self._row(item)

            response = self._stream_csv(filename=filename, rows=row_iter())
            logger.info(
                f"Export success: kind={export_kind} format={export_format} user_id={user_id} rows={rows_count}"
            )
            return response
        except Exception as e:
            logger.error(
                f"Export failed: kind={export_kind} format={export_format} user_id={user_id} error={str(e)}"
            )
            raise

    async def export_my_wishlist_ods(self, user_id: int, username: str) -> Response:
        export_kind = "wishlist"
        export_format = "ods"
        logger.info(f"Export requested: kind={export_kind} format={export_format} user_id={user_id}")
        try:
            items = await self.wishlist_repository.get_user_wishlist_all(user_id)
            filename = self._build_filename(username=username, suffix="wishlist.ods")
            headers = self._headers()
            rows = [self._row(item) for item in items]
            response = self._file_response(
                filename=filename,
                media_type="application/vnd.oasis.opendocument.spreadsheet",
                content=self._build_ods(sheet_name="Wishlist", headers=headers, rows=rows),
            )
            logger.info(
                f"Export success: kind={export_kind} format={export_format} user_id={user_id} rows={len(rows)}"
            )
            return response
        except Exception as e:
            logger.error(
                f"Export failed: kind={export_kind} format={export_format} user_id={user_id} error={str(e)}"
            )
            raise

    def _headers(self) -> list[str]:
        return [
            "wishlist_id",
            "entity_type",
            "external_id",
            "external_source",
            "title",
            "image_url",
            "added_at",
        ]

    def _row(self, item: Wishlist) -> list[str]:
        entity_type = item.entity_type.name.lower() if item.entity_type else ""
        external_source = (
            item.external_source.name if item.external_source else ""
        )
        return [
            str(item.id),
            entity_type,
            item.external_id or "",
            external_source,
            item.title or "",
            item.image_url or "",
            item.created_at.isoformat() if item.created_at else "",
        ]

    def _stream_csv(self, filename: str, rows: Iterable[list[str]]) -> StreamingResponse:
        def generate() -> Iterable[bytes]:
            buffer = io.StringIO()
            writer = csv.writer(buffer, delimiter=";", quoting=csv.QUOTE_MINIMAL)
            first_chunk = True

            for row in rows:
                buffer.seek(0)
                buffer.truncate(0)
                writer.writerow(row)
                chunk = buffer.getvalue()

                if first_chunk:
                    first_chunk = False
                    chunk = "\ufeff" + chunk

                yield chunk.encode("utf-8")

        return StreamingResponse(
            generate(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    def _build_ods(self, sheet_name: str, headers: list[str], rows: list[list[str]]) -> bytes:
        doc = OpenDocumentSpreadsheet()
        header_style = Style(name="HeaderStyle", family="paragraph")
        header_style.addElement(TextProperties(fontweight="bold"))
        doc.styles.addElement(header_style)

        table = Table(name=sheet_name)
        for _ in headers:
            table.addElement(TableColumn())

        header_row = TableRow()
        for header in headers:
            cell = TableCell()
            cell.addElement(P(stylename=header_style, text=header))
            header_row.addElement(cell)
        table.addElement(header_row)

        for row_values in rows:
            row = TableRow()
            for value in row_values:
                cell = TableCell()
                cell.addElement(P(text=value))
                row.addElement(cell)
            table.addElement(row)

        doc.spreadsheet.addElement(table)
        out = io.BytesIO()
        doc.save(out)
        return out.getvalue()

    def _file_response(self, filename: str, media_type: str, content: bytes) -> Response:
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    def _build_filename(self, username: str, suffix: str) -> str:
        date_str = datetime.now(UTC).strftime("%Y-%m-%d")
        safe_username = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in (username or "user")).strip("_")
        return f"wishlist_{safe_username}_{date_str}_{suffix}"

