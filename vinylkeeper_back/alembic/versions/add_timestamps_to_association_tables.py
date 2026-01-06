"""add_timestamps_to_association_tables

Revision ID: add_timestamps_assoc
Revises: restore_critical_indexes
Create Date: 2026-01-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_timestamps_assoc'
down_revision: Union[str, None] = 'restore_critical_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add created_at and updated_at columns to collection_album and collection_artist tables."""

    # Add timestamps to collection_album table as nullable first
    op.add_column('collection_album',
                  sa.Column('created_at', sa.DateTime(timezone=True),
                            nullable=True))
    op.add_column('collection_album',
                  sa.Column('updated_at', sa.DateTime(timezone=True),
                            nullable=True))

    # Add timestamps to collection_artist table as nullable first
    op.add_column('collection_artist',
                  sa.Column('created_at', sa.DateTime(timezone=True),
                            nullable=True))
    op.add_column('collection_artist',
                  sa.Column('updated_at', sa.DateTime(timezone=True),
                            nullable=True))

    # Add performance indexes for dashboard queries
    # Partial index for updated_at (only non-NULL values) for faster sorting
    # PostgreSQL can efficiently use this index for both ASC and DESC ordering
    op.create_index(
        'ix_collection_album_updated_at',
        'collection_album',
        ['updated_at'],
        unique=False,
        postgresql_where=sa.text('updated_at IS NOT NULL')
    )
    
    op.create_index(
        'ix_collection_artist_updated_at',
        'collection_artist',
        ['updated_at'],
        unique=False,
        postgresql_where=sa.text('updated_at IS NOT NULL')
    )


def downgrade() -> None:
    """Remove created_at and updated_at columns from association tables."""

    # Drop indexes first
    op.drop_index('ix_collection_artist_updated_at', table_name='collection_artist')
    op.drop_index('ix_collection_album_updated_at', table_name='collection_album')

    # Drop columns
    op.drop_column('collection_artist', 'updated_at')
    op.drop_column('collection_artist', 'created_at')
    op.drop_column('collection_album', 'updated_at')
    op.drop_column('collection_album', 'created_at')
