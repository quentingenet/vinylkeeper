"""remove_duplicate_indexes

Revision ID: 48aee46d80a2
Revises: c40d6b791c84
Create Date: 2025-09-04 19:34:20.233628+02:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48aee46d80a2'
down_revision: Union[str, None] = 'c40d6b791c84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove duplicate indexes that are redundant with primary keys
    # These indexes consume space and provide no performance benefit
    
    # Single column ID indexes (duplicates of primary keys)
    op.drop_index('ix_albums_id', 'albums')
    op.drop_index('ix_artists_id', 'artists')
    op.drop_index('ix_collections_id', 'collections')
    op.drop_index('ix_likes_id', 'likes')
    op.drop_index('ix_loans_id', 'loans')
    op.drop_index('ix_moderation_requests_id', 'moderation_requests')
    op.drop_index('ix_place_likes_id', 'place_likes')
    op.drop_index('ix_places_id', 'places')
    op.drop_index('ix_users_id', 'users')
    op.drop_index('ix_vinyl_states_id', 'vinyl_states')
    op.drop_index('ix_wishlist_id', 'wishlist')


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate the duplicate indexes (not recommended)
    op.create_index('ix_wishlist_id', 'wishlist', ['id'])
    op.create_index('ix_vinyl_states_id', 'vinyl_states', ['id'])
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_places_id', 'places', ['id'])
    op.create_index('ix_place_likes_id', 'place_likes', ['id'])
    op.create_index('ix_moderation_requests_id', 'moderation_requests', ['id'])
    op.create_index('ix_loans_id', 'loans', ['id'])
    op.create_index('ix_likes_id', 'likes', ['id'])
    op.create_index('ix_collections_id', 'collections', ['id'])
    op.create_index('ix_artists_id', 'artists', ['id'])
    op.create_index('ix_albums_id', 'albums', ['id'])
