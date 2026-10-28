"""add_pressing_details

Pressing details on albums (country, label, catalogue number, formats), filled by the
Discogs enrichment, and collection_album.pressing_confirmed. Albums added before
pressings were shown in search results start unconfirmed: their owner may have picked
the first release offered rather than the one on their shelf.

Revision ID: ce658faf1952
Revises: 292492abda3a
Create Date: 2026-10-28 15:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ce658faf1952'
down_revision: Union[str, None] = '292492abda3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('albums', sa.Column('country', sa.String(length=100), nullable=True,
                                      comment='Country of this pressing'))
    op.add_column('albums', sa.Column('label', sa.String(length=512), nullable=True,
                                      comment='First label of this pressing'))
    op.add_column('albums', sa.Column('catno', sa.String(length=255), nullable=True,
                                      comment='Catalogue number'))
    op.add_column('albums', sa.Column('formats', postgresql.ARRAY(sa.Text()), nullable=True,
                                      comment='Format descriptions (LP, Reissue, Mono...); NULL = not fetched yet'))
    op.add_column('collection_album', sa.Column('pressing_confirmed', sa.Boolean(), nullable=False,
                                                server_default=sa.false(),
                                                comment='The owner chose or confirmed this exact release'))


def downgrade() -> None:
    op.drop_column('collection_album', 'pressing_confirmed')
    op.drop_column('albums', 'formats')
    op.drop_column('albums', 'catno')
    op.drop_column('albums', 'label')
    op.drop_column('albums', 'country')
