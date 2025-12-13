"""add_composite_index_for_places_map

Revision ID: 8ffba0a1556d
Revises: f8a3b2e1c9d0
Create Date: 2025-12-14 14:27:25.404918+01:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ffba0a1556d'
down_revision: Union[str, None] = 'f8a3b2e1c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add composite indexes for /places/map and /places/coordinates endpoints optimization."""
    # Index composite partiel pour optimiser la requête get_map_places
    # Couvre les colonnes nécessaires dans l'ordre optimal pour les filtres
    # avec WHERE clause pour limiter l'index aux lignes pertinentes uniquement
    # Cela permet un index plus petit et beaucoup plus rapide
    op.create_index(
        'ix_places_map_valid_moderated_coords',
        'places',
        ['latitude', 'longitude', 'id', 'city'],
        unique=False,
        postgresql_where=sa.text('is_valid = true AND is_moderated = true AND latitude IS NOT NULL AND longitude IS NOT NULL')
    )
    
    # Index composite partiel pour optimiser la recherche exacte par coordonnées
    # (latitude, longitude) en premier pour la recherche exacte
    # avec WHERE clause pour limiter l'index aux places valides et modérées
    op.create_index(
        'ix_places_coordinates_exact_search',
        'places',
        ['latitude', 'longitude'],
        unique=False,
        postgresql_where=sa.text('is_valid = true AND is_moderated = true AND latitude IS NOT NULL AND longitude IS NOT NULL')
    )


def downgrade() -> None:
    """Remove composite indexes for places map and coordinates."""
    op.drop_index('ix_places_coordinates_exact_search', table_name='places', if_exists=True)
    op.drop_index('ix_places_map_valid_moderated_coords', table_name='places', if_exists=True)
