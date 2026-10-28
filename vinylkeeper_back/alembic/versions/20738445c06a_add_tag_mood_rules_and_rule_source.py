"""add_tag_mood_rules_and_rule_source

Creates tag_mood_rules (Discogs style/genre -> mood weights) and allows
album_moods.source = 'rule' for moods derived from those rules.
Rules content is not inserted here: it is synced from app/data/tag_mood_rules.py.

Revision ID: 20738445c06a
Revises: 8606fe5a06aa
Create Date: 2026-10-28 08:50:24.567674+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '20738445c06a'
down_revision: Union[str, None] = '8606fe5a06aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_album_moods_source', 'album_moods', type_='check')
    op.create_check_constraint(
        'ck_album_moods_source', 'album_moods', "source IN ('rule', 'llm', 'user')")
    op.alter_column(
        'album_moods', 'source',
        existing_type=sa.String(length=10), existing_nullable=False,
        comment="Who assigned the mood: 'rule', 'llm' or 'user'",
        existing_comment="Who assigned the mood: 'llm' or 'user'",
    )

    op.create_table(
        'tag_mood_rules',
        sa.Column('tag', sa.String(length=100), nullable=False, comment='Discogs style or genre name, exact case'),
        sa.Column('mood_id', sa.Integer(), nullable=False),
        sa.Column('weight', sa.SmallInteger(), nullable=False, comment='1 = hint, 2 = typical, 3 = defining'),
        sa.CheckConstraint('weight BETWEEN 1 AND 3', name='ck_tag_mood_rules_weight'),
        sa.ForeignKeyConstraint(['mood_id'], ['moods.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('tag', 'mood_id'),
    )
    op.create_index('ix_tag_mood_rules_mood_id', 'tag_mood_rules', ['mood_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_tag_mood_rules_mood_id', table_name='tag_mood_rules')
    op.drop_table('tag_mood_rules')

    # Rule-derived moods cannot exist under the previous constraint; they are
    # fully reproducible from the rules, so dropping them loses nothing.
    op.execute("DELETE FROM album_moods WHERE source = 'rule'")
    op.alter_column(
        'album_moods', 'source',
        existing_type=sa.String(length=10), existing_nullable=False,
        comment="Who assigned the mood: 'llm' or 'user'",
        existing_comment="Who assigned the mood: 'rule', 'llm' or 'user'",
    )
    op.drop_constraint('ck_album_moods_source', 'album_moods', type_='check')
    op.create_check_constraint('ck_album_moods_source', 'album_moods', "source IN ('llm', 'user')")
