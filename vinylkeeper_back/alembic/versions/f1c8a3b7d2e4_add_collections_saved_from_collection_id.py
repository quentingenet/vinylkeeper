"""add_collections_saved_from_collection_id

The saved copy of a collection ("SAVE <name> (<date>)") points to the collection it saves.
The unique index allows one save per collection: saving again is refused until the owner
deletes the save. A new nullable column: existing rows are untouched.

Revision ID: f1c8a3b7d2e4
Revises: e7b3d9a1c5f2
Create Date: 2026-10-29 12:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f1c8a3b7d2e4'
down_revision: Union[str, None] = 'e7b3d9a1c5f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('collections', sa.Column('saved_from_collection_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_collections_saved_from_collection_id', 'collections', 'collections',
        ['saved_from_collection_id'], ['id'], ondelete='SET NULL',
    )
    op.create_index('ix_collections_saved_from_collection_id', 'collections', ['saved_from_collection_id'],
                    unique=True)


def downgrade() -> None:
    op.drop_index('ix_collections_saved_from_collection_id', table_name='collections')
    op.drop_constraint('fk_collections_saved_from_collection_id', 'collections', type_='foreignkey')
    op.drop_column('collections', 'saved_from_collection_id')
