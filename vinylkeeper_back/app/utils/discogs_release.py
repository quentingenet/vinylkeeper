"""Pressing details of a Discogs /releases/{id} payload, shared by album details and enrichment."""
import re
from typing import Any, Optional
from urllib.parse import urlparse

# Discogs disambiguates homonyms: "Columbia (2)", "Wings (2)"
DISAMBIGUATION_SUFFIX = re.compile(r"\s*\(\d+\)$")

DISCOGS_IMAGE_HOST = "i.discogs.com"

# A Discogs id (release, master, artist): digits only. It goes into the path of API calls made
# with the token of the application, so nothing else may reach them ("../" for instance).
DISCOGS_ID_PATTERN = r"^[0-9]{1,12}$"

# Column sizes of the albums table
COUNTRY_MAX_LENGTH = 100
LABEL_MAX_LENGTH = 512
CATNO_MAX_LENGTH = 255


def clean_artist_name(name: str) -> str:
    """'Wings (2)' -> 'Wings', 'Hirt*' -> 'Hirt' (Discogs disambiguation markers)."""
    name = name.strip().rstrip("*").strip()
    return DISAMBIGUATION_SUFFIX.sub("", name).rstrip("*").strip()


# Discogs markup in free text (an artist's profile)
MARKUP_LINK = re.compile(r"\[url=[^\]]*\](.*?)\[/url\]", re.IGNORECASE | re.DOTALL)
MARKUP_ORPHAN_LINK_TAG = re.compile(r"\[url=[^\]]*\]|\[/url\]", re.IGNORECASE)
MARKUP_NAMED_REFERENCE = re.compile(r"\[[almrg]=([^\[\]]+)\]", re.IGNORECASE)
MARKUP_ID_REFERENCE = re.compile(r"\[[almrg]\d+\]", re.IGNORECASE)
MARKUP_FORMATTING = re.compile(r"\[/?[biu]\]", re.IGNORECASE)
# Where a reference by id was: a character no profile contains, so the tidying only touches those places
REMOVED = "\x00"
REMOVED_LIST = re.compile(r"\x00(?:\s*(?:,|and|&)\s*\x00)+")
REMOVED_BEFORE_OTHERS = re.compile(r"\x00,?\s+and others")
REMOVED_IN_PARENTHESES = re.compile(r"\s*\([^()\x00]*\x00[^()]*\)")
REMOVED_WITH_SPACES = re.compile(r"[ \t]*\x00")


def clean_discogs_markup(text: Optional[str]) -> str:
    """
    Discogs markup of a profile as plain text: '[a=Freeman (3)]' -> 'Freeman', '[url=...]site[/url]' ->
    'site', '[i]x[/i]' -> 'x'. A reference by id alone ('[a123456]') has no text to keep: it goes, with
    what it leaves behind ('Worked with [a1], [a2] and others' -> 'Worked with others').
    Line breaks stay (the app shows the paragraphs), runs of spaces collapse.
    """
    if not text:
        return ""
    text = MARKUP_LINK.sub(r"\1", text)
    text = MARKUP_ORPHAN_LINK_TAG.sub("", text)
    text = MARKUP_NAMED_REFERENCE.sub(lambda match: clean_artist_name(match.group(1)), text)
    text = MARKUP_FORMATTING.sub("", text)
    if MARKUP_ID_REFERENCE.search(text):
        text = _drop_id_references(text)
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def _drop_id_references(text: str) -> str:
    """Remove the references by id, then the list commas, parentheses and spaces they leave empty."""
    text = MARKUP_ID_REFERENCE.sub(REMOVED, text)
    text = REMOVED_LIST.sub(REMOVED, text)
    text = REMOVED_BEFORE_OTHERS.sub("others", text)
    text = REMOVED_IN_PARENTHESES.sub("", text)
    # A space or comma left right before punctuation, where a reference was
    text = re.sub(r"[ \t]*\x00[ \t]*,?(?=[,.;:!?)])", "", text)
    return REMOVED_WITH_SPACES.sub("", text)


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
