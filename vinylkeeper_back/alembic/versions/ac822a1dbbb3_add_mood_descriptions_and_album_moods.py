"""add_mood_descriptions_and_album_moods

Adds an English description to moods, extends the vocabulary from 10 to 17
moods and creates the album_moods association table.

Data is inlined on purpose: migrations must not import application code.

Revision ID: ac822a1dbbb3
Revises: b222fb2e3d98
Create Date: 2026-10-28 07:58:58.252226+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'ac822a1dbbb3'
down_revision: Union[str, None] = 'b222fb2e3d98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


EXISTING_MOOD_DESCRIPTIONS = {
    "happy": "Joyful, light and carefree. Bright melodies and a sunny feel, with no deeper emotional weight.",
    "uplifting": "Inspiring and hopeful. Builds up and lifts the listener's spirit; more emotional and soaring than simply happy.",
    "energetic": "Fast, driving and dynamic. High tempo and momentum that keeps the listener moving.",
    "powerful": "Epic, grand and majestic. Large scale, dramatic build-ups and a strong sense of grandeur.",
    "mysterious": "Enigmatic and intriguing. Unusual harmonies or textures that create suspense and curiosity rather than fear.",
    "calm": "Peaceful, still and soothing. Slow pace, gentle dynamics and little rhythmic drive, ideal for quiet listening. More static than laid_back.",
    "romantic": "Tender, loving or sensual. Intimate, warm and affectionate music about love and closeness.",
    "nostalgic": "Evokes the past and fond memories. A vintage or retro feel that recalls another era.",
    "melancholic": "Bittersweet and wistful. A gentle sadness that remains beautiful and reflective. Never combined with sad.",
    "sad": "Heavy, sorrowful and grieving. Deep sadness, loss or heartbreak without consolation. Never combined with melancholic.",
}

NEW_MOOD_DESCRIPTIONS = {
    "groovy": "Rhythm-first and danceable. A tight, infectious groove that makes you nod or dance, as in funk, soul, disco or afrobeat.",
    "aggressive": "Raw, harsh and intense. Anger, distortion and brute force, as in punk, thrash or hardcore.",
    "rebellious": "Defiant, militant or socially conscious. Music of protest, resistance and empowerment, as in roots reggae, punk, conscious hip-hop or protest folk.",
    "dark": "Somber, cold or ominous. Bleak atmospheres and a sense of unease, as in post-punk, goth, doom or dark ambient.",
    "dreamy": "Hazy, floating and ethereal. Washed-out textures and a weightless, otherworldly feel, as in shoegaze, dream pop or ambient.",
    "laid_back": "Relaxed and easygoing with a gentle, swaying groove. Warm and unhurried, as in roots reggae, dub, lounge or yacht rock. Looser and more rhythmic than calm.",
    "spiritual": "Devotional, sacred or transcendent. Music of faith, meditation or inner elevation, as in gospel or spiritual jazz.",
}


def upgrade() -> None:
    op.add_column('moods', sa.Column('description', sa.String(length=255), nullable=True))

    update_stmt = sa.text("UPDATE moods SET description = :description WHERE name = :name")
    for name, description in EXISTING_MOOD_DESCRIPTIONS.items():
        op.execute(update_stmt.bindparams(name=name, description=description))

    insert_stmt = sa.text(
        "INSERT INTO moods (name, description) VALUES (:name, :description) "
        "ON CONFLICT (name) DO NOTHING"
    )
    for name, description in NEW_MOOD_DESCRIPTIONS.items():
        op.execute(insert_stmt.bindparams(name=name, description=description))

    op.create_table(
        'album_moods',
        sa.Column('album_id', sa.Integer(), nullable=False),
        sa.Column('mood_id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=10), nullable=False,
                  comment="Who assigned the mood: 'llm' or 'user'"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("source IN ('llm', 'user')", name='ck_album_moods_source'),
        sa.ForeignKeyConstraint(['album_id'], ['albums.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['mood_id'], ['moods.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('album_id', 'mood_id'),
    )
    op.create_index('ix_album_moods_mood_id', 'album_moods', ['mood_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_album_moods_mood_id', table_name='album_moods')
    op.drop_table('album_moods')

    new_names = list(NEW_MOOD_DESCRIPTIONS)
    referenced = op.get_bind().execute(
        sa.text(
            "SELECT m.name FROM collections c JOIN moods m ON m.id = c.mood_id "
            "WHERE m.name IN :names GROUP BY m.name"
        ).bindparams(sa.bindparam('names', expanding=True)),
        {"names": new_names},
    ).scalars().all()
    if referenced:
        raise RuntimeError(
            f"Cannot downgrade: moods {sorted(referenced)} are still used by collections.mood_id"
        )

    op.execute(
        sa.text("DELETE FROM moods WHERE name IN :names")
        .bindparams(sa.bindparam('names', value=new_names, expanding=True))
    )
    op.drop_column('moods', 'description')
