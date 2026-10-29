"""add_discogs_imports

Imports of public Discogs collections: their status and counters, polled by the frontend
while an import runs, then kept as its summary.

Revision ID: e7b3d9a1c5f2
Revises: d4a7c2e9f1b3
Create Date: 2026-10-29 10:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e7b3d9a1c5f2'
down_revision: Union[str, None] = 'd4a7c2e9f1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'discogs_imports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('collection_id', sa.Integer(), sa.ForeignKey('collections.id', ondelete='SET NULL'),
                  nullable=True),
        sa.Column('discogs_username', sa.String(100), nullable=False),
        sa.Column('saved_copy_collection_id', sa.Integer(),
                  sa.ForeignKey('collections.id', ondelete='SET NULL'), nullable=True),
        sa.Column('saved_copy_name', sa.String(255), nullable=True),
        sa.Column('created_collection', sa.Boolean(), server_default=sa.false(), nullable=False,
                  comment='The collection was created for this import (removed if it fails empty)'),
        sa.Column('status', sa.String(20), server_default='queued', nullable=False),
        sa.Column('pages_total', sa.Integer(), server_default='0', nullable=False),
        sa.Column('pages_done', sa.Integer(), server_default='0', nullable=False),
        sa.Column('items_total', sa.Integer(), server_default='0', nullable=False,
                  comment='Discogs items, every format'),
        sa.Column('vinyl_found', sa.Integer(), server_default='0', nullable=False,
                  comment='Distinct vinyl releases'),
        sa.Column('other_formats', sa.Integer(), server_default='0', nullable=False,
                  comment='Items skipped: not vinyl'),
        sa.Column('added', sa.Integer(), server_default='0', nullable=False,
                  comment='Releases added to the collection'),
        sa.Column('copies_added', sa.Integer(), server_default='0', nullable=False,
                  comment='Copies, duplicates included'),
        sa.Column('already_in_collection', sa.Integer(), server_default='0', nullable=False),
        sa.Column('other_pressings', sa.Integer(), server_default='0', nullable=False,
                  comment='Added releases whose work was already in the collection, another pressing'),
        sa.Column('in_other_collections', sa.Integer(), server_default='0', nullable=False,
                  comment='Added releases already in another collection of the user'),
        sa.Column('error_message', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('queued', 'running', 'done', 'failed')", name='ck_discogs_imports_status'),
    )
    op.create_index('ix_discogs_imports_user_id_id', 'discogs_imports', ['user_id', 'id'])


def downgrade() -> None:
    op.drop_index('ix_discogs_imports_user_id_id', table_name='discogs_imports')
    op.drop_table('discogs_imports')
