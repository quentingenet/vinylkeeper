"""add_discogs_enrichment_columns_to_albums

Additive only: nullable columns filled later by the album enrichment service
(CLI backfill + background enrichment on album creation).

Revision ID: 8606fe5a06aa
Revises: ac822a1dbbb3
Create Date: 2026-10-28 08:20:25.838341+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '8606fe5a06aa'
down_revision: Union[str, None] = 'ac822a1dbbb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('albums', sa.Column(
        'external_master_id', sa.String(length=255), nullable=True,
        comment='External master ID (groups pressings of the same work)'))
    op.add_column('albums', sa.Column(
        'release_year', sa.SmallInteger(), nullable=True, comment='Year of this pressing'))
    op.add_column('albums', sa.Column(
        'original_year', sa.SmallInteger(), nullable=True, comment='Original release year of the work (master)'))
    op.add_column('albums', sa.Column(
        'artist_name', sa.String(length=512), nullable=True, comment='Artist names of the release'))
    op.add_column('albums', sa.Column('genres', sa.ARRAY(sa.Text()), nullable=True))
    op.add_column('albums', sa.Column('styles', sa.ARRAY(sa.Text()), nullable=True))
    op.add_column('albums', sa.Column(
        'enriched_at', sa.DateTime(timezone=True), nullable=True,
        comment='When the release metadata was fetched; NULL = not enriched yet'))
    op.add_column('albums', sa.Column(
        'enrichment_status', sa.String(length=20), nullable=True,
        comment="'ok' | 'pending_master' | 'not_found'"))

    op.create_check_constraint(
        'ck_albums_enrichment_status', 'albums',
        "enrichment_status IN ('ok', 'pending_master', 'not_found')")
    op.create_index('ix_albums_genres', 'albums', ['genres'], unique=False, postgresql_using='gin')
    op.create_index('ix_albums_styles', 'albums', ['styles'], unique=False, postgresql_using='gin')
    op.create_index('ix_albums_external_master_id', 'albums', ['external_master_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_albums_external_master_id', table_name='albums')
    op.drop_index('ix_albums_styles', table_name='albums')
    op.drop_index('ix_albums_genres', table_name='albums')
    op.drop_constraint('ck_albums_enrichment_status', 'albums', type_='check')
    op.drop_column('albums', 'enrichment_status')
    op.drop_column('albums', 'enriched_at')
    op.drop_column('albums', 'styles')
    op.drop_column('albums', 'genres')
    op.drop_column('albums', 'artist_name')
    op.drop_column('albums', 'original_year')
    op.drop_column('albums', 'release_year')
    op.drop_column('albums', 'external_master_id')
