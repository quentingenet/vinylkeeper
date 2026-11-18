"""add_discogs_api_usage

Calls made to the Discogs API, per hour and per part of the app (search, metadata, price,
import, enrichment, oauth), for the gauge of the admin page. Each process adds its counts
about once a minute; rows older than a month are removed by the nightly job.

Revision ID: c4e9a2f7b1d3
Revises: b3c8e5a1d7f4
Create Date: 2026-11-18 18:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4e9a2f7b1d3'
down_revision: Union[str, None] = 'b3c8e5a1d7f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'discogs_api_usage',
        sa.Column('hour', sa.DateTime(timezone=True), nullable=False, comment='Start of the hour, UTC'),
        sa.Column('source', sa.String(length=20), nullable=False,
                  comment='search, metadata, price, import, enrichment or oauth'),
        sa.Column('calls', sa.Integer(), nullable=False),
        sa.Column('rate_limited', sa.Integer(), nullable=False, comment='Answers 429 among the calls'),
        sa.Column('min_remaining', sa.Integer(), nullable=True,
                  comment='Lowest X-Discogs-Ratelimit-Remaining seen in the hour, null when not sent'),
        sa.PrimaryKeyConstraint('hour', 'source'),
    )


def downgrade() -> None:
    op.drop_table('discogs_api_usage')
