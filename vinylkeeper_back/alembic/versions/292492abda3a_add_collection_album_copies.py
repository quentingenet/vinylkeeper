"""add_collection_album_copies

Several copies of the same album in a collection, each with its own condition
(GitHub issue #31). Every existing collection_album row gets one copy holding its
current state. The state columns of collection_album are kept but no longer used,
so that a downgrade can restore them from the first copy.

Revision ID: 292492abda3a
Revises: 20738445c06a
Create Date: 2026-10-28 14:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '292492abda3a'
down_revision: Union[str, None] = '20738445c06a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'collection_album_copies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('album_id', sa.Integer(), nullable=False),
        sa.Column('state_record', sa.Integer(), sa.ForeignKey('vinyl_states.id'), nullable=True),
        sa.Column('state_cover', sa.Integer(), sa.ForeignKey('vinyl_states.id'), nullable=True),
        sa.Column('acquisition_month_year', sa.String(length=7), nullable=True, comment='Format: YYYY-MM'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ['collection_id', 'album_id'],
            ['collection_album.collection_id', 'collection_album.album_id'],
            ondelete='CASCADE',
        ),
    )
    op.create_index(
        'ix_collection_album_copies_collection_album', 'collection_album_copies', ['collection_id', 'album_id'])

    op.execute("""
        INSERT INTO collection_album_copies
            (collection_id, album_id, state_record, state_cover, acquisition_month_year, created_at, updated_at)
        SELECT collection_id, album_id, state_record, state_cover, acquisition_month_year,
               COALESCE(created_at, now()), COALESCE(updated_at, created_at, now())
        FROM collection_album
        ORDER BY collection_id, album_id
    """)


def downgrade() -> None:
    # The first copy (lowest id) is what clients unaware of copies were reading
    op.execute("""
        UPDATE collection_album ca
        SET state_record = first.state_record,
            state_cover = first.state_cover,
            acquisition_month_year = first.acquisition_month_year
        FROM (
            SELECT DISTINCT ON (collection_id, album_id)
                   collection_id, album_id, state_record, state_cover, acquisition_month_year
            FROM collection_album_copies
            ORDER BY collection_id, album_id, id
        ) AS first
        WHERE ca.collection_id = first.collection_id AND ca.album_id = first.album_id
    """)
    op.drop_index('ix_collection_album_copies_collection_album', table_name='collection_album_copies')
    op.drop_table('collection_album_copies')
