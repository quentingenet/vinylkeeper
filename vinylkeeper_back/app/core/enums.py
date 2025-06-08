from enum import Enum


class ModerationStatusEnum(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class PlaceTypeEnum(str, Enum):
    SHOP = "shop"
    VENUE = "venue"
    RECORD_STORE = "record_store"
    OTHER = "other"
    BROCANT = "brocant"


class RoleEnum(str, Enum):
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"


class EntityTypeEnum(str, Enum):
    ALBUM = "ALBUM"
    ARTIST = "ARTIST"


class StateEnum(str, Enum):
    MINT = "MINT"
    NEAR_MINT = "NEAR_MINT"
    VERY_GOOD = "VERY_GOOD"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"


class MoodEnum(str, Enum):
    HAPPY = "HAPPY"
    SAD = "SAD"
    EXCITED = "EXCITED"
    CALM = "CALM"
    ANGRY = "ANGRY"
    RELAXED = "RELAXED"
    ENERGETIC = "ENERGETIC"
    MELANCHOLIC = "MELANCHOLIC"


class ExternalSourceEnum(str, Enum):
    DEEZER = "DEEZER"
    SPOTIFY = "SPOTIFY"
    MUSICBRAINZ = "MUSICBRAINZ"
    DISCOGS = "DISCOGS"
    LAST_FM = "LAST_FM"
