"""add_indexes_for_stats_created_at

Revision ID: 29fb075ba718
Revises: 8341b73c03ab
Create Date: 2025-12-14 21:27:47.998279+01:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '29fb075ba718'
down_revision: Union[str, None] = '8341b73c03ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add indexes on created_at columns for stats endpoint optimization."""
    connection = op.get_bind()
    
    # Check if index on albums.created_at exists
    result_albums = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'albums' 
            AND indexname = 'ix_albums_created_at'
        )
    """))
    albums_index_exists = result_albums.scalar()
    
    if not albums_index_exists:
        op.create_index(
            'ix_albums_created_at',
            'albums',
            ['created_at'],
            unique=False
        )
    
    # Check if index on artists.created_at exists
    result_artists = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'artists' 
            AND indexname = 'ix_artists_created_at'
        )
    """))
    artists_index_exists = result_artists.scalar()
    
    if not artists_index_exists:
        op.create_index(
            'ix_artists_created_at',
            'artists',
            ['created_at'],
            unique=False
        )


def downgrade() -> None:
    """Remove indexes on created_at columns."""
    op.drop_index('ix_artists_created_at', table_name='artists', if_exists=True)
    op.drop_index('ix_albums_created_at', table_name='albums', if_exists=True)
