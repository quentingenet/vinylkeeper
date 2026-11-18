"""The callback of the iOS app: the one of the native app, marked app=ios."""
from app.services.discogs_oauth_service import ios_callback


def test_marks_the_native_callback():
    assert ios_callback("https://vinylkeeper.org/discogs/callback") == (
        "https://vinylkeeper.org/discogs/callback?app=ios")


def test_keeps_a_query_of_its_own_and_never_marks_twice():
    assert ios_callback("https://vinylkeeper.org/discogs/callback?from=app&app=android") == (
        "https://vinylkeeper.org/discogs/callback?from=app&app=ios")
