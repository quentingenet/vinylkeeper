"""add_index_for_places_coordinates_exact_search

Revision ID: 8341b73c03ab
Revises: 8ffba0a1556d
Create Date: 2025-12-14 14:30:08.302555+01:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8341b73c03ab'
down_revision: Union[str, None] = '8ffba0a1556d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add index for /places/coordinates endpoint optimization."""
    # Index composite partiel pour optimiser la recherche exacte par coordonnées
    # (latitude, longitude) en premier pour la recherche exacte
    # avec WHERE clause pour limiter l'index aux places valides et modérées
    # Note: Cet index peut déjà exister si créé dans la migration précédente
    # On vérifie l'existence avant de créer pour éviter les erreurs en production
    connection = op.get_bind()
    result = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'places' 
            AND indexname = 'ix_places_coordinates_exact_search'
        )
    """))
    index_exists = result.scalar()
    
    if not index_exists:
        op.create_index(
            'ix_places_coordinates_exact_search',
            'places',
            ['latitude', 'longitude'],
            unique=False,
            postgresql_where=sa.text('is_valid = true AND is_moderated = true AND latitude IS NOT NULL AND longitude IS NOT NULL')
        )


def downgrade() -> None:
    """Remove index for places coordinates exact search."""
    op.drop_index('ix_places_coordinates_exact_search', table_name='places')
