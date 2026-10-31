"""Discogs artist names: homonym markers go, the name itself stays."""
import pytest

from app.schemas.artist_schema import ArtistCreate
from app.utils.discogs_release import clean_artist_name, format_values, join_artist_credit, parse_release_marks


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


@pytest.mark.parametrize("formats, expected", [
    ([{"name": "Vinyl", "qty": "1", "descriptions": ["LP", "Album"]}], ["LP", "Album"]),
    ([{"name": "Vinyl", "qty": "2", "descriptions": ["LP"], "text": "180 Gram"}], ["2 × Vinyl", "LP", "180 Gram"]),
    ([{"name": "Vinyl", "descriptions": ["LP"], "text": "Red Translucent"}, {"name": "Box Set"}],
     ["LP", "Red Translucent", "Box Set"]),
    (None, []),
])
def test_format_values_keep_what_tells_the_pressing_apart(formats, expected):
    assert format_values(formats) == expected


@pytest.mark.parametrize("released, expected", [
    ("1972", "1972"), ("1972-05-00", "1972-05"), ("1972-00-00", "1972"), ("2013-05-17", "2013-05-17"),
    ("", None), ("unknown", None),
])
def test_release_date_drops_the_unknown_parts(released, expected):
    assert parse_release_marks({"released": released})["released"] == expected
