"""drop_collection_album_legacy_states

The condition of a record lives on its copies (collection_album_copies) since 292492abda3a.
The state columns of collection_album were kept frozen for clients unaware of copies;
none is left, so they go. A downgrade brings them back, filled from the first copy.

Revision ID: 1d0b708e3fe3
Revises: ce658faf1952
Create Date: 2026-10-28 18:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '1d0b708e3fe3'
down_revision: Union[str, None] = 'ce658faf1952'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('collection_album', 'acquisition_month_year')
    op.drop_column('collection_album', 'state_cover')
    op.drop_column('collection_album', 'state_record')


def downgrade() -> None:
    op.add_column('collection_album', sa.Column(
        'state_record', sa.Integer(), sa.ForeignKey('vinyl_states.id'), nullable=True))
    op.add_column('collection_album', sa.Column(
        'state_cover', sa.Integer(), sa.ForeignKey('vinyl_states.id'), nullable=True))
    op.add_column('collection_album', sa.Column(
        'acquisition_month_year', sa.String(length=7), nullable=True, comment='Format: YYYY-MM'))
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
