"""add_cascade_and_indexes_moderation_requests

Revision ID: b475567323ec
Revises: e1a2b3c4d5e6
Create Date: 2026-06-19 20:31:03.580177+02:00

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'b475567323ec'
down_revision: Union[str, None] = 'e1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_moderation_requests_place_id', 'moderation_requests', ['place_id'])
    op.create_index('ix_moderation_requests_user_id', 'moderation_requests', ['user_id'])
    op.create_index('ix_moderation_requests_status_id', 'moderation_requests', ['status_id'])

    op.drop_constraint('moderation_requests_place_id_fkey', 'moderation_requests', type_='foreignkey')
    op.drop_constraint('moderation_requests_user_id_fkey', 'moderation_requests', type_='foreignkey')
    op.drop_constraint('moderation_requests_status_id_fkey', 'moderation_requests', type_='foreignkey')

    op.create_foreign_key(
        'moderation_requests_place_id_fkey', 'moderation_requests', 'places', ['place_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'moderation_requests_user_id_fkey', 'moderation_requests', 'users', ['user_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'moderation_requests_status_id_fkey', 'moderation_requests', 'moderation_statuses', ['status_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('moderation_requests_place_id_fkey', 'moderation_requests', type_='foreignkey')
    op.drop_constraint('moderation_requests_user_id_fkey', 'moderation_requests', type_='foreignkey')
    op.drop_constraint('moderation_requests_status_id_fkey', 'moderation_requests', type_='foreignkey')

    op.create_foreign_key(
        'moderation_requests_place_id_fkey', 'moderation_requests', 'places', ['place_id'], ['id']
    )
    op.create_foreign_key(
        'moderation_requests_user_id_fkey', 'moderation_requests', 'users', ['user_id'], ['id']
    )
    op.create_foreign_key(
        'moderation_requests_status_id_fkey', 'moderation_requests', 'moderation_statuses', ['status_id'], ['id']
    )

    op.drop_index('ix_moderation_requests_place_id', table_name='moderation_requests')
    op.drop_index('ix_moderation_requests_user_id', table_name='moderation_requests')
    op.drop_index('ix_moderation_requests_status_id', table_name='moderation_requests')
