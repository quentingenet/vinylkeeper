"""restore_critical_performance_indexes

Revision ID: restore_critical_indexes
Revises: 29fb075ba718
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'restore_critical_indexes'
down_revision: Union[str, None] = '29fb075ba718'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Restore critical performance indexes that were removed.

    Note: places.is_moderated is already covered by partial indexes:
    - ix_places_coordinates_exact_search
    - ix_places_map_valid_moderated_coords
    So we don't need a simple ix_places_is_moderated index.
    """
    connection = op.get_bind()

    # 1. Index for wishlist queries (PRIORITY HIGH - very frequent)
    # Critical for: wishlist pagination, user-centric endpoints, avoids full scan
    result_wishlist = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'wishlist' 
            AND indexname = 'ix_wishlist_user_id_entity_type'
        )
    """))
    if not result_wishlist.scalar():
        op.create_index(
            'ix_wishlist_user_id_entity_type',
            'wishlist',
            ['user_id', 'entity_type_id'],
            unique=False
        )

    # 2. Index for collection_album queries by album_id (reverse lookup)
    # Useful for: stats, album → collections queries
    result_album_id = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'collection_album' 
            AND indexname = 'ix_collection_album_album_id'
        )
    """))
    if not result_album_id.scalar():
        op.create_index(
            'ix_collection_album_album_id',
            'collection_album',
            ['album_id'],
            unique=False
        )

    # 3. Index for collection_artist queries by artist_id (reverse lookup)
    # Useful for: stats, artist → collections queries
    result_artist_id = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'collection_artist' 
            AND indexname = 'ix_collection_artist_artist_id'
        )
    """))
    if not result_artist_id.scalar():
        op.create_index(
            'ix_collection_artist_artist_id',
            'collection_artist',
            ['artist_id'],
            unique=False
        )


def downgrade() -> None:
    """Remove restored indexes."""
    op.drop_index('ix_collection_artist_artist_id',
                  table_name='collection_artist', if_exists=True)
    op.drop_index('ix_collection_album_album_id',
                  table_name='collection_album', if_exists=True)
    op.drop_index('ix_wishlist_user_id_entity_type',
                  table_name='wishlist', if_exists=True)
