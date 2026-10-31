"""Pressing details of a Discogs /releases/{id} payload, shared by album details and enrichment."""
import re
from typing import Any, Optional
from urllib.parse import urlparse

# Discogs disambiguates homonyms: "Columbia (2)", "Wings (2)"
DISAMBIGUATION_SUFFIX = re.compile(r"\s*\(\d+\)$")

DISCOGS_IMAGE_HOST = "i.discogs.com"

# Column sizes of the albums table
COUNTRY_MAX_LENGTH = 100
LABEL_MAX_LENGTH = 512
CATNO_MAX_LENGTH = 255


def clean_artist_name(name: str) -> str:
    """'Wings (2)' -> 'Wings', 'Hirt*' -> 'Hirt' (Discogs disambiguation markers)."""
    name = name.strip().rstrip("*").strip()
    return DISAMBIGUATION_SUFFIX.sub("", name).rstrip("*").strip()


def join_artist_credit(artists: Any) -> Optional[str]:
    """
    Artists of a release as Discogs credits them: 'Billy Preston & Syreeta',
    'Kenny Burrell With Stanley Turrentine'. Each artist's 'join' links it to the next one.
    """
    credit = ""
    previous_join: Optional[str] = None
    for artist in artists if isinstance(artists, list) else []:
        name = clean_artist_name(artist.get("name") or "") if isinstance(artist, dict) else ""
        if not name:
            continue
        if credit:
            join = (previous_join or "").strip()
            credit += ", " if join in ("", ",") else f" {join} "
        credit += name
        previous_join = artist.get("join")
    return credit or None


def is_discogs_image(url: Optional[str]) -> bool:
    """An https image of the Discogs CDN, the only host the image proxy serves."""
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname == DISCOGS_IMAGE_HOST


def format_values(formats: Any) -> list[str]:
    """
    Format of a release as chips: '2 × Vinyl' for several discs, the descriptions ('LP', 'Album')
    and the free text Discogs adds ('180 Gram', 'Red Translucent'). 'Vinyl' alone tells nothing.
    """
    values: list[str] = []
    for fmt in formats if isinstance(formats, list) else []:
        if not isinstance(fmt, dict):
            continue
        name = fmt.get("name") or ""
        qty = str(fmt.get("qty") or "1")
        if qty.isdigit() and int(qty) > 1:
            values.append(f"{qty} × {name or 'Vinyl'}")
        elif name != "Vinyl":
            values.append(name)
        values.extend(fmt.get("descriptions") or [])
        values.append(fmt.get("text") or "")
    return list(dict.fromkeys(value.strip() for value in values if value and value.strip()))


def parse_release_edition(data: dict[str, Any]) -> dict[str, Any]:
    """Country, first label, catalogue number and format of a release."""
    labels = data.get("labels") or [{}]
    label = DISAMBIGUATION_SUFFIX.sub("", labels[0].get("name") or "")
    catno = labels[0].get("catno") or ""
    return {
        "country": (data.get("country") or "")[:COUNTRY_MAX_LENGTH] or None,
        "label": label[:LABEL_MAX_LENGTH] or None,
        # Discogs writes "none" when there is no catalogue number
        "catno": catno[:CATNO_MAX_LENGTH] if catno and catno.lower() != "none" else None,
        "formats": format_values(data.get("formats")),
    }


def parse_release_marks(data: dict[str, Any]) -> dict[str, Any]:
    """
    What is printed or etched on the record, to tell a pressing from another: barcode,
    matrix / runout of each side, and the release date ('1972', '1972-05', '1972-05-17').
    """
    identifiers = [i for i in data.get("identifiers") or [] if isinstance(i, dict) and i.get("value")]

    def values(kind: str) -> list[str]:
        return [i["value"].strip() for i in identifiers if i.get("type") == kind]

    # Discogs pads an unknown month or day with 00
    released = re.sub(r"(-00)+$", "", str(data.get("released") or "").strip())
    return {
        "barcode": next(iter(values("Barcode")), None),
        "matrix": list(dict.fromkeys(values("Matrix / Runout"))),
        "released": released if re.fullmatch(r"\d{4}(-\d{2}){0,2}", released) else None,
    }
