"""drop_redundant_indexes

Indexes no query needs, checked against the production plans (EXPLAIN before and after):
- a primary key or unique constraint starting with the same column already serves the lookup
  (collection_album, collection_artist, collections.owner_id, albums/artists external ids);
- no reader since the dashboard moved to updated_at in January 2026 (albums/artists created_at);
- covered by the (is_public, updated_at DESC) and (is_public, created_at DESC) indexes;
- a single external source, a name never searched alone, a loans table nothing reads.
A downgrade recreates them as they were in production.

Revision ID: 9f0fb98ad1aa
Revises: 1d0b708e3fe3
Create Date: 2026-10-28 18:30:00.000000+01:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '9f0fb98ad1aa'
down_revision: Union[str, None] = '1d0b708e3fe3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# name -> (table, definition as in production)
REDUNDANT_INDEXES = {
    'ix_albums_created_at': ('albums', '(created_at)'),
    'ix_albums_external_album_id': ('albums', '(external_album_id)'),
    'ix_albums_external_source_id': ('albums', '(external_source_id)'),
    'ix_artists_created_at': ('artists', '(created_at)'),
    'ix_artists_external_artist_id': ('artists', '(external_artist_id)'),
    'ix_artists_external_source_id': ('artists', '(external_source_id)'),
    'ix_collection_album_collection_id': ('collection_album', '(collection_id)'),
    'ix_collection_artist_collection_id': ('collection_artist', '(collection_id)'),
    'ix_collections_is_public': ('collections', '(is_public) WHERE is_public = true'),
    'ix_collections_name': ('collections', '(name)'),
    'ix_collections_owner_id': ('collections', '(owner_id)'),
    'ix_loans_borrower_name': ('loans', '(borrower_name)'),
}


def upgrade() -> None:
    for name in REDUNDANT_INDEXES:
        op.execute(f'DROP INDEX IF EXISTS {name}')


def downgrade() -> None:
    for name, (table, definition) in REDUNDANT_INDEXES.items():
        op.execute(f'CREATE INDEX IF NOT EXISTS {name} ON {table} {definition}')
