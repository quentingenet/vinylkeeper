"""add_discogs_imports_wantlist

An import of a Discogs collection can also import the wantlist into the wishlist, as a second
phase of the same import: its counters, and the phase the progress counts. New columns only.

Revision ID: b7e2c4f9a1d3
Revises: a3d6f8b1c9e2
Create Date: 2026-10-30 10:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b7e2c4f9a1d3'
down_revision: Union[str, None] = 'a3d6f8b1c9e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COUNTERS = (
    ('wantlist_items_total', 'Every format'),
    ('wantlist_vinyl_found', None),
    ('wantlist_other_formats', None),
    ('wantlist_added', 'Added to the wishlist'),
    ('wantlist_already_in_wishlist', None),
    ('wantlist_owned', 'Skipped: this very pressing is in a collection of the user'),
    ('wantlist_other_pressings_owned', 'Added: another pressing of the work is in a collection'),
)


def upgrade() -> None:
    op.add_column('discogs_imports', sa.Column('include_wantlist', sa.Boolean(), server_default=sa.false(),
                                               nullable=False))
    op.add_column('discogs_imports', sa.Column(
        'phase', sa.String(20), server_default='collection', nullable=False,
        comment="'collection' then 'wantlist': what pages_total and pages_done count"))
    for name, comment in COUNTERS:
        op.add_column('discogs_imports', sa.Column(name, sa.Integer(), server_default='0', nullable=False,
                                                   comment=comment))
    op.add_column('discogs_imports', sa.Column(
        'wantlist_error', sa.String(255), nullable=True,
        comment='Why the wantlist was not imported (the collection was)'))
    op.create_check_constraint('ck_discogs_imports_phase', 'discogs_imports', "phase IN ('collection', 'wantlist')")


def downgrade() -> None:
    op.drop_constraint('ck_discogs_imports_phase', 'discogs_imports', type_='check')
    op.drop_column('discogs_imports', 'wantlist_error')
    for name, _comment in reversed(COUNTERS):
        op.drop_column('discogs_imports', name)
    op.drop_column('discogs_imports', 'phase')
    op.drop_column('discogs_imports', 'include_wantlist')
