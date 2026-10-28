"""
A work is a Discogs master: all its pressings (releases) are one record in collection views.
Albums without a known master (not enriched yet, or none on Discogs) are a work of their own.
"""
from sqlalchemy import String, cast, distinct, func, literal_column, select

from app.models.album_model import Album
from app.models.collection_album import CollectionAlbum


def work_key(album=Album):
    """
    Same value for every pressing of a work; the prefix keeps release ids apart from master ids.
    The prefix is inlined, not bound: DISTINCT ON and ORDER BY must render the very same expression.
    `album` may be an alias of the albums table, for subqueries.
    """
    return func.coalesce(album.external_master_id, literal_column("'release:'", String) + cast(album.id, String))


def works_count_in_collection(collection_id):
    """Scalar subquery: number of works in a collection (a column, for correlated counts, or a value)."""
    return (
        select(func.count(distinct(work_key())))
        .select_from(CollectionAlbum)
        .join(Album, Album.id == CollectionAlbum.album_id)
        .where(CollectionAlbum.collection_id == collection_id)
        .scalar_subquery()
    )
