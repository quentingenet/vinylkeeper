"""Discogs artist names: homonym markers go, the name itself stays."""
import pytest

from app.schemas.artist_schema import ArtistCreate
from app.utils.discogs_release import clean_artist_name, join_artist_credit


@pytest.mark.parametrize("raw, expected", [
    ("Trust (2)", "Trust"),
    ("Jimmy Smith (12)", "Jimmy Smith"),
    ("Hirt*", "Hirt"),
    ("Hirt* (2)", "Hirt"),
    ("Simon & Garfunkel", "Simon & Garfunkel"),
    ("Earth, Wind & Fire", "Earth, Wind & Fire"),
    ("The (International) Noise Conspiracy", "The (International) Noise Conspiracy"),
    ("Blink-182", "Blink-182"),
])
def test_clean_artist_name(raw, expected):
    assert clean_artist_name(raw) == expected


def test_credit_uses_the_discogs_joins():
    assert join_artist_credit([
        {"name": "Billy Preston", "join": "&"}, {"name": "Syreeta", "join": ""},
    ]) == "Billy Preston & Syreeta"
    assert join_artist_credit([{"name": "A", "join": "Feat."}, {"name": "B (2)"}]) == "A Feat. B"
    assert join_artist_credit([{"name": "A"}, {"name": "B"}]) == "A, B"


def test_credit_without_artists():
    assert join_artist_credit(None) is None
    assert join_artist_credit([{"name": ""}, "junk"]) is None


def test_new_artist_is_stored_without_the_homonym_marker():
    artist = ArtistCreate(external_artist_id="1", external_source_id=1, title="Barbara (5)")

    assert artist.title == "Barbara"
