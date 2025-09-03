"""add_performance_indexes

Revision ID: c40d6b791c84
Revises: 175c9fc3a15e
Create Date: 2025-09-04 07:00:54.470212+02:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c40d6b791c84'
down_revision: Union[str, None] = '175c9fc3a15e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Safe indexes - only the most critical ones without risk
    
    # 1. Index for wishlist queries (very frequent)
    op.create_index('ix_wishlist_user_id_entity_type', 'wishlist', ['user_id', 'entity_type_id'])
    
    # 2. Index for collection_album queries (frequent joins)
    op.create_index('ix_collection_album_collection_id', 'collection_album', ['collection_id'])
    
    # 3. Index for collection_artist queries (frequent joins)
    op.create_index('ix_collection_artist_collection_id', 'collection_artist', ['collection_id'])
    
    # 4. Index for places queries (moderation filtering)
    op.create_index('ix_places_is_moderated', 'places', ['is_moderated'])
    
    # Note: ix_likes_collection_id already exists, no need to create it


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes in reverse order
    op.drop_index('ix_places_is_moderated', 'places')
    op.drop_index('ix_collection_artist_collection_id', 'collection_artist')
    op.drop_index('ix_collection_album_collection_id', 'collection_album')
    op.drop_index('ix_wishlist_user_id_entity_type', 'wishlist')
