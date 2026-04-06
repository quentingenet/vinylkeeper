"""add_trigram_indexes_for_search

Revision ID: e1a2b3c4d5e6
Revises: f31515000cc6
Create Date: 2026-06-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, None] = 'f31515000cc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_albums_title_trgm "
        "ON albums USING GIN (title gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_artists_title_trgm "
        "ON artists USING GIN (title gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_artists_title_trgm")
    op.execute("DROP INDEX IF EXISTS ix_albums_title_trgm")
