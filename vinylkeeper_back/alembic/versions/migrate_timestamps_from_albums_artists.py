"""migrate_timestamps_from_albums_artists

Revision ID: migrate_timestamps_assoc
Revises: add_timestamps_assoc
Create Date: 2026-01-06 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'migrate_timestamps_assoc'
down_revision: Union[str, None] = 'add_timestamps_assoc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migrate timestamps from albums and artists tables to association tables."""

    # Migrate timestamps from albums table to collection_album
    # Copy created_at from album, set updated_at to the same value as created_at
    # Use explicit subquery to ensure values are copied correctly
    op.execute(sa.text("""
        UPDATE collection_album ca
        SET 
            created_at = (SELECT a.created_at FROM albums a WHERE a.id = ca.album_id),
            updated_at = (SELECT a.created_at FROM albums a WHERE a.id = ca.album_id)
        WHERE EXISTS (SELECT 1 FROM albums a WHERE a.id = ca.album_id)
    """))

    # Migrate timestamps from artists table to collection_artist
    # Copy created_at from artist, set updated_at to the same value as created_at
    # Use explicit subquery to ensure values are copied correctly
    op.execute(sa.text("""
        UPDATE collection_artist ca
        SET 
            created_at = (SELECT a.created_at FROM artists a WHERE a.id = ca.artist_id),
            updated_at = (SELECT a.created_at FROM artists a WHERE a.id = ca.artist_id)
        WHERE EXISTS (SELECT 1 FROM artists a WHERE a.id = ca.artist_id)
    """))


def downgrade() -> None:
    """Reset timestamps in association tables to NULL."""
    # Reset created_at and updated_at to NULL in collection_album
    op.execute("""
        UPDATE collection_album
        SET 
            created_at = NULL,
            updated_at = NULL
    """)

    # Reset created_at and updated_at to NULL in collection_artist
    op.execute("""
        UPDATE collection_artist
        SET 
            created_at = NULL,
            updated_at = NULL
    """)
