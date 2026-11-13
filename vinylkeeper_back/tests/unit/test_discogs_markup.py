"""Discogs markup in free text (an artist's profile): the words stay, the tags go."""
import pytest

from app.utils.discogs_release import clean_discogs_markup

IAM_PROFILE = (
    "In the beginning the group was born in 1984/85 when rapper [a=Akhenaton] and [a=DJ Khéops] performed "
    "under the name of \"Lively Crew\".\n"
    "One year later [a=Shurik'n], producer [a=Imhotep], dancer [a=Kephren] and [a=Freeman (3)], a dancer "
    "who started to rap, joined them.\n"
    "For 2013 the upcoming album \"I AM Legend\" is planned in collaboration with [a=Ennio Morricone]."
)
IAM_CLEAN = (
    "In the beginning the group was born in 1984/85 when rapper Akhenaton and DJ Khéops performed "
    "under the name of \"Lively Crew\".\n"
    "One year later Shurik'n, producer Imhotep, dancer Kephren and Freeman, a dancer "
    "who started to rap, joined them.\n"
    "For 2013 the upcoming album \"I AM Legend\" is planned in collaboration with Ennio Morricone."
)

PAOLO_CONTE_PROFILE = (
    "Formed as jazz pianist; in 1962 with the [a=Paolo Conte Quartet], where his brother [a=Giorgio Conte] "
    "plays the drums, makes the recording debut (with the [l=Rca Italiana]). In 2007 receives the honorary "
    "degree in painting from the [i]Academy of Fine Arts[/i] of Catanzaro for [i]\"Razmataz\"[/i], a "
    "multimedia opera."
)
PAOLO_CONTE_CLEAN = (
    "Formed as jazz pianist; in 1962 with the Paolo Conte Quartet, where his brother Giorgio Conte "
    "plays the drums, makes the recording debut (with the Rca Italiana). In 2007 receives the honorary "
    "degree in painting from the Academy of Fine Arts of Catanzaro for \"Razmataz\", a "
    "multimedia opera."
)

NAS_PROFILE = (
    "American rapper, songwriter and actor, born September 14, 1973 in Queens, New York.\n"
    "Son of jazz musician [a=Olu Dara].\n"
    "Founder of rap group [a=Bravehearts] which consisted of [a=Wiz (4)], his cousin [a=Nashawn] and "
    "brother [a=Jungle (2)].\n"
    "Married to [a=Kelis] aka [a=Kelis Rogers] from 2005 until 2010. Father of [a=Destiny Jones].\n"
    "In 2014, the label [l=Mass Appeal] was founded by Nas and [a=Peter Bittenbender] following a "
    "distribution deal with Universal Music Group."
)
NAS_CLEAN = (
    "American rapper, songwriter and actor, born September 14, 1973 in Queens, New York.\n"
    "Son of jazz musician Olu Dara.\n"
    "Founder of rap group Bravehearts which consisted of Wiz, his cousin Nashawn and "
    "brother Jungle.\n"
    "Married to Kelis aka Kelis Rogers from 2005 until 2010. Father of Destiny Jones.\n"
    "In 2014, the label Mass Appeal was founded by Nas and Peter Bittenbender following a "
    "distribution deal with Universal Music Group."
)

DOROTHY_ASHBY_PROFILE = (
    "American jazz harpist\n"
    "Born August 6, 1932 in Detroit, Michigan, died April 13, 1986 in Santa Monica, California\n"
    "Worked with [a29974], [a261974], [a281313], [a261196], [a30486], [a252311] and others. She was taught "
    "to play the harp by Velma Froude at Cass Technical High School in Detroit, who would teach Alice McLeod "
    "(better known as [a42058]) a couple of years later. She had two music publishing houses [l2605840] and "
    "[l313823]."
)
DOROTHY_ASHBY_CLEAN = (
    "American jazz harpist\n"
    "Born August 6, 1932 in Detroit, Michigan, died April 13, 1986 in Santa Monica, California\n"
    "Worked with others. She was taught "
    "to play the harp by Velma Froude at Cass Technical High School in Detroit, who would teach Alice McLeod "
    "a couple of years later. She had two music publishing houses."
)


def test_real_profiles():
    assert clean_discogs_markup(IAM_PROFILE) == IAM_CLEAN
    assert clean_discogs_markup(PAOLO_CONTE_PROFILE) == PAOLO_CONTE_CLEAN
    assert clean_discogs_markup(NAS_PROFILE) == NAS_CLEAN
    # References by id only: nothing to show, and what they leave behind (a list, a parenthesis) goes too
    assert clean_discogs_markup(DOROTHY_ASHBY_PROFILE) == DOROTHY_ASHBY_CLEAN


@pytest.mark.parametrize("raw, expected", [
    # Links keep their text
    ("See [url=https://www.iam.tm]the official site[/url].", "See the official site."),
    ("[URL=http://example.org]Home[/URL]", "Home"),
    # Named references keep the name, without the homonym marker
    ("Signed to [l=Columbia (2)].", "Signed to Columbia."),
    ("From [m=Nevermind] and [r=Smells Like Teen Spirit].", "From Nevermind and Smells Like Teen Spirit."),
    ("Group: [g=Hip Hop]", "Group: Hip Hop"),
    ("[a=The (International) Noise Conspiracy]", "The (International) Noise Conspiracy"),
    # References by id only have no text to keep
    ("Member of [a123456] since 1990.", "Member of since 1990."),
    ("Released as [r123], [l12], [m45] and [M45].", "Released as."),
    ("Also known as [a42058] & [a42059], see below.", "Also known as, see below."),
    # The tidying only follows a removed reference: spaces before punctuation elsewhere stay as written
    ("Is it live ? Yes .", "Is it live ? Yes ."),
    # Formatting tags go, their content stays
    ("[b]Bold[/b], [i]italic[/i] and [u]underlined[/u]", "Bold, italic and underlined"),
    ("[B]Loud[/B]", "Loud"),
    # Nested markup
    ("[url=https://x.org][b][a=IAM][/b][/url]", "IAM"),
    ("[i][a=Freeman (3)][/i]", "Freeman"),
    # Malformed markup: orphan link tags go, anything else is left as written
    ("[url=https://x.org]Unclosed link", "Unclosed link"),
    ("Closed link[/url] only", "Closed link only"),
    ("[a=Unclosed reference", "[a=Unclosed reference"),
    ("Live [at the Olympia]", "Live [at the Olympia]"),
    # Spaces: runs collapse, lines are trimmed, paragraphs stay
    ("  Two   spaces\t\there  ", "Two spaces here"),
    ("First line  \n\n\n\n  Second line", "First line\n\nSecond line"),
    # Text without markup is unchanged
    ("Plain biography, no markup at all.", "Plain biography, no markup at all."),
])
def test_clean_discogs_markup(raw, expected):
    assert clean_discogs_markup(raw) == expected


@pytest.mark.parametrize("empty", [None, "", "   ", "\n\n"])
def test_nothing_gives_an_empty_text(empty):
    assert clean_discogs_markup(empty) == ""
