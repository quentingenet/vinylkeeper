"""add_indexes_for_explore_page

Revision ID: f8a3b2e1c9d0
Revises: b6acf817fef8
Create Date: 2025-01-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a3b2e1c9d0'
down_revision: Union[str, None] = 'b6acf817fef8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for Explore page queries."""
    
    # Index sur is_public (améliore le filtre WHERE is_public = True)
    op.create_index(
        'ix_collections_is_public',
        'collections',
        ['is_public'],
        unique=False,
        postgresql_where=sa.text('is_public = true')
    )
    
    # Index composite pour tri par updated_at
    op.create_index(
        'ix_collections_is_public_updated_at',
        'collections',
        ['is_public', 'updated_at'],
        unique=False,
        postgresql_ops={'updated_at': 'DESC'}
    )
    
    # Index composite pour tri par created_at
    op.create_index(
        'ix_collections_is_public_created_at',
        'collections',
        ['is_public', 'created_at'],
        unique=False,
        postgresql_ops={'created_at': 'DESC'}
    )
    
    # Index pour collection_album EXISTS check
    op.create_index(
        'ix_collection_album_collection_id',
        'collection_album',
        ['collection_id'],
        unique=False
    )
    
    # Index pour collection_artist EXISTS check
    op.create_index(
        'ix_collection_artist_collection_id',
        'collection_artist',
        ['collection_id'],
        unique=False
    )


def downgrade() -> None:
    """Remove performance indexes."""
    op.drop_index('ix_collection_artist_collection_id', table_name='collection_artist')
    op.drop_index('ix_collection_album_collection_id', table_name='collection_album')
    op.drop_index('ix_collections_is_public_created_at', table_name='collections')
    op.drop_index('ix_collections_is_public_updated_at', table_name='collections')
    op.drop_index('ix_collections_is_public', table_name='collections')

