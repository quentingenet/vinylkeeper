"""add_indexes_external_source_id_mood_id

Revision ID: b222fb2e3d98
Revises: place_location_not_null
Create Date: 2026-06-22 06:15:45.698057+02:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b222fb2e3d98'
down_revision: Union[str, None] = 'place_location_not_null'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_albums_external_source_id', 'albums', ['external_source_id'], unique=False)
    op.create_index('ix_artists_external_source_id', 'artists', ['external_source_id'], unique=False)
    op.create_index('ix_collections_mood_id', 'collections', ['mood_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_collections_mood_id', table_name='collections')
    op.drop_index('ix_artists_external_source_id', table_name='artists')
    op.drop_index('ix_albums_external_source_id', table_name='albums')
