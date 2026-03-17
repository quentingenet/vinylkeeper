from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable, Optional

from fastapi.responses import Response, StreamingResponse
from odf.opendocument import OpenDocumentSpreadsheet
from odf.style import Style, TableColumnProperties, TextProperties
from odf.table import Table, TableCell, TableColumn, TableRow
from odf.text import P

from app.core.exceptions import ForbiddenError, ResourceNotFoundError
from app.core.logging import logger
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.association_tables import CollectionArtist
from app.models.collection_album import CollectionAlbum
from app.models.collection_model import Collection
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.collection_repository import CollectionRepository


@dataclass(frozen=True)
class ExportFile:
    filename: str
    media_type: str
    content: bytes


class ExportService:
    """Service responsible for exporting collection data to file formats."""

    def __init__(
        self,
        collection_repository: CollectionRepository,
        collection_album_repository: CollectionAlbumRepository,
    ) -> None:
        self.collection_repository = collection_repository
        self.collection_album_repository = collection_album_repository

    async def export_collection_albums_csv(
        self, collection_id: int, user_id: int
    ) -> StreamingResponse:
        export_kind = "collection_albums"
        export_format = "csv"
        logger.info(
            f"Export requested: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id}"
        )
        try:
            collection = await self._get_owned_collection(collection_id, user_id)
            albums_with_metadata = (
                await self.collection_album_repository.get_collection_albums(collection_id)
            )

            filename = self._build_filename(collection, suffix="albums.csv")
            headers = self._album_csv_headers()
            rows_count = len(albums_with_metadata)

            def row_iter() -> Iterable[list[str]]:
                yield headers
                for album, collection_album in albums_with_metadata:
                    yield self._album_to_csv_row(album, collection_album, collection)

            response = self._stream_csv(filename=filename, rows=row_iter())
            logger.info(
                f"Export success: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} rows={rows_count}"
            )
            return response
        except Exception as e:
            logger.error(
                f"Export failed: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} error={str(e)}"
            )
            raise

    async def export_collection_artists_csv(
        self, collection_id: int, user_id: int
    ) -> StreamingResponse:
        export_kind = "collection_artists"
        export_format = "csv"
        logger.info(
            f"Export requested: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id}"
        )
        try:
            collection = await self._get_owned_collection(collection_id, user_id)
            artists_with_association = await self.collection_repository.get_collection_artists(
                collection_id
            )

            filename = self._build_filename(collection, suffix="artists.csv")
            headers = self._artist_csv_headers()
            rows_count = len(artists_with_association)

            def row_iter() -> Iterable[list[str]]:
                yield headers
                for artist, collection_artist in artists_with_association:
                    yield self._artist_to_csv_row(
                        artist, collection_artist, collection
                    )

            response = self._stream_csv(filename=filename, rows=row_iter())
            logger.info(
                f"Export success: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} rows={rows_count}"
            )
            return response
        except Exception as e:
            logger.error(
                f"Export failed: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} error={str(e)}"
            )
            raise

    async def export_collection_albums_ods(
        self, collection_id: int, user_id: int
    ) -> Response:
        export_kind = "collection_albums"
        export_format = "ods"
        logger.info(
            f"Export requested: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id}"
        )
        try:
            collection = await self._get_owned_collection(collection_id, user_id)
            albums_with_metadata = (
                await self.collection_album_repository.get_collection_albums(collection_id)
            )
            headers = self._album_csv_headers()
            rows = [
                self._album_to_csv_row(album, collection_album, collection)
                for album, collection_album in albums_with_metadata
            ]
            export_file = self._build_ods_file(
                filename=self._build_filename(collection, suffix="albums.ods"),
                sheet_name="Albums",
                headers=headers,
                rows=rows,
            )
            response = self._file_response(export_file)
            logger.info(
                f"Export success: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} rows={len(rows)}"
            )
            return response
        except Exception as e:
            logger.error(
                f"Export failed: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} error={str(e)}"
            )
            raise

    async def export_collection_artists_ods(
        self, collection_id: int, user_id: int
    ) -> Response:
        export_kind = "collection_artists"
        export_format = "ods"
        logger.info(
            f"Export requested: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id}"
        )
        try:
            collection = await self._get_owned_collection(collection_id, user_id)
            artists_with_association = await self.collection_repository.get_collection_artists(
                collection_id
            )
            headers = self._artist_csv_headers()
            rows = [
                self._artist_to_csv_row(artist, collection_artist, collection)
                for artist, collection_artist in artists_with_association
            ]
            export_file = self._build_ods_file(
                filename=self._build_filename(collection, suffix="artists.ods"),
                sheet_name="Artists",
                headers=headers,
                rows=rows,
            )
            response = self._file_response(export_file)
            logger.info(
                f"Export success: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} rows={len(rows)}"
            )
            return response
        except Exception as e:
            logger.error(
                f"Export failed: kind={export_kind} format={export_format} user_id={user_id} collection_id={collection_id} error={str(e)}"
            )
            raise

    async def _get_owned_collection(self, collection_id: int, user_id: int) -> Collection:
        collection = await self.collection_repository.get_by_id(
            collection_id, load_relations=False, load_minimal=False
        )
        if not collection:
            raise ResourceNotFoundError("Collection", collection_id)
        if collection.owner_id != user_id:
            raise ForbiddenError(
                error_code=4003,
                message="You can only export your own collections",
                details={"collection_id": collection_id},
            )
        return collection

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
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    def _file_response(self, export_file: ExportFile) -> Response:
        return Response(
            content=export_file.content,
            media_type=export_file.media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{export_file.filename}"',
            },
        )

    def _build_ods_file(
        self,
        filename: str,
        sheet_name: str,
        headers: list[str],
        rows: list[list[str]],
    ) -> ExportFile:
        doc = OpenDocumentSpreadsheet()

        header_style = Style(name="HeaderStyle", family="paragraph")
        header_style.addElement(TextProperties(fontweight="bold"))
        doc.styles.addElement(header_style)

        table = Table(name=sheet_name)
        for _ in headers:
            col_style = Style(name="ColStyle", family="table-column")
            col_style.addElement(TableColumnProperties(columnwidth="3cm"))
            doc.automaticstyles.addElement(col_style)
            table.addElement(TableColumn(stylename=col_style))

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

        return ExportFile(
            filename=filename,
            media_type="application/vnd.oasis.opendocument.spreadsheet",
            content=out.getvalue(),
        )

    def _build_filename(self, collection: Collection, suffix: str) -> str:
        safe_name = "".join(
            c if c.isalnum() or c in ("-", "_") else "_" for c in (collection.name or "collection")
        ).strip("_")
        date_str = datetime.now(UTC).strftime("%Y-%m-%d")
        return f"{safe_name}_{collection.id}_{date_str}_{suffix}"

    def _album_csv_headers(self) -> list[str]:
        return [
            "collection_id",
            "collection_name",
            "album_id",
            "external_album_id",
            "external_source",
            "artist_name",
            "album_title",
            "full_title",
            "state_record",
            "state_cover",
            "acquisition_month_year",
            "added_at",
            "updated_at",
            "image_url",
        ]

    def _artist_csv_headers(self) -> list[str]:
        return [
            "collection_id",
            "collection_name",
            "artist_id",
            "external_artist_id",
            "external_source",
            "artist_name",
            "added_at",
            "updated_at",
            "image_url",
        ]

    def _album_to_csv_row(
        self, album: Album, collection_album: CollectionAlbum, collection: Collection
    ) -> list[str]:
        artist_name, album_title = self._split_album_title(album.title)
        return [
            str(collection.id),
            collection.name or "",
            str(album.id),
            album.external_album_id or "",
            album.external_source.name if getattr(album, "external_source", None) else "",
            artist_name,
            album_title,
            album.title or "",
            self._vinyl_state_name(collection_album.state_record_ref),
            self._vinyl_state_name(collection_album.state_cover_ref),
            collection_album.acquisition_month_year or "",
            self._format_dt(collection_album.created_at),
            self._format_dt(collection_album.updated_at),
            album.image_url or "",
        ]

    def _artist_to_csv_row(
        self,
        artist: Artist,
        collection_artist: CollectionArtist,
        collection: Collection,
    ) -> list[str]:
        return [
            str(collection.id),
            collection.name or "",
            str(artist.id),
            artist.external_artist_id or "",
            artist.external_source.name if getattr(artist, "external_source", None) else "",
            artist.title or "",
            self._format_dt(collection_artist.created_at),
            self._format_dt(collection_artist.updated_at),
            artist.image_url or "",
        ]

    def _vinyl_state_name(self, vinyl_state: Optional[object]) -> str:
        if vinyl_state is None:
            return ""
        name = getattr(vinyl_state, "name", None)
        return str(name) if name else ""

    def _format_dt(self, value: Optional[datetime]) -> str:
        if value is None:
            return ""
        try:
            return value.isoformat()
        except Exception:
            return str(value)

    def _split_album_title(self, full_title: Optional[str]) -> tuple[str, str]:
        if not full_title:
            return "", ""
        parts = [p.strip() for p in full_title.split(" - ", 1)]
        if len(parts) == 2:
            return parts[0], parts[1]
        return "", full_title

