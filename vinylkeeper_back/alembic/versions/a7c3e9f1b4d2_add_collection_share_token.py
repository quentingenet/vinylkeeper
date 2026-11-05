"""add_collection_share_token

The key of the public link of a collection: random, so that shared links cannot be guessed from
the sequential ids. The server default fills the existing rows, each with its own value.

Revision ID: a7c3e9f1b4d2
Revises: f5c1d9e3a7b2
Create Date: 2026-11-06 09:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a7c3e9f1b4d2'
down_revision: Union[str, None] = 'f5c1d9e3a7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('collections', sa.Column(
        'share_token',
        sa.String(32),
        nullable=False,
        server_default=sa.text("replace(gen_random_uuid()::text, '-', '')"),
    ))
    op.create_index('ix_collections_share_token', 'collections', ['share_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_collections_share_token', table_name='collections')
    op.drop_column('collections', 'share_token')
