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


def is_discogs_image(url: Optional[str]) -> bool:
    """An https image of the Discogs CDN, the only host the image proxy serves."""
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname == DISCOGS_IMAGE_HOST


def parse_release_edition(data: dict[str, Any]) -> dict[str, Any]:
    """Country, first label, catalogue number and format descriptions (without 'Vinyl')."""
    labels = data.get("labels") or [{}]
    descriptions = [
        value
        for fmt in data.get("formats") or []
        for value in [fmt.get("name"), *(fmt.get("descriptions") or [])]
        if value and value != "Vinyl"
    ]
    label = DISAMBIGUATION_SUFFIX.sub("", labels[0].get("name") or "")
    catno = labels[0].get("catno") or ""
    return {
        "country": (data.get("country") or "")[:COUNTRY_MAX_LENGTH] or None,
        "label": label[:LABEL_MAX_LENGTH] or None,
        # Discogs writes "none" when there is no catalogue number
        "catno": catno[:CATNO_MAX_LENGTH] if catno and catno.lower() != "none" else None,
        "formats": list(dict.fromkeys(descriptions)),
    }
