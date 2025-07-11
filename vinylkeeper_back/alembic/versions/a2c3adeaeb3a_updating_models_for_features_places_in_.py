"""Updating models for features 'places'in DB

Revision ID: a2c3adeaeb3a
Revises: d3046d311edf
Create Date: 2025-06-27 14:58:35.726461+02:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2c3adeaeb3a'
down_revision: Union[str, None] = 'd3046d311edf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('place_likes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('place_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['place_id'], ['places.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'place_id', name='uq_user_place_like')
    )
    op.create_index(op.f('ix_place_likes_id'), 'place_likes', ['id'], unique=False)
    op.create_index(op.f('ix_place_likes_place_id'), 'place_likes', ['place_id'], unique=False)
    op.create_index(op.f('ix_place_likes_user_id'), 'place_likes', ['user_id'], unique=False)
    #op.create_unique_constraint('uq_collection_album', 'collection_album', ['collection_id', 'album_id'])
    op.add_column('places', sa.Column('description', sa.String(length=255), nullable=True))
    op.add_column('places', sa.Column('source_url', sa.String(length=255), nullable=True))
    op.add_column('places', sa.Column('is_valid', sa.Boolean(), nullable=False))
    op.drop_constraint(op.f('places_submitted_by_id_fkey'), 'places', type_='foreignkey')
    op.create_foreign_key(None, 'places', 'users', ['submitted_by_id'], ['id'], ondelete='SET NULL')
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'places', type_='foreignkey')
    op.create_foreign_key(op.f('places_submitted_by_id_fkey'), 'places', 'users', ['submitted_by_id'], ['id'], ondelete='CASCADE')
    op.drop_column('places', 'is_valid')
    op.drop_column('places', 'source_url')
    op.drop_column('places', 'description')
    #op.drop_constraint('uq_collection_album', 'collection_album', type_='unique')
    op.drop_index(op.f('ix_place_likes_user_id'), table_name='place_likes')
    op.drop_index(op.f('ix_place_likes_place_id'), table_name='place_likes')
    op.drop_index(op.f('ix_place_likes_id'), table_name='place_likes')
    op.drop_table('place_likes')
    # ### end Alembic commands ###
