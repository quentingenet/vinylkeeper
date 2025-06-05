from enum import Enum


class ModerationStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PlaceTypeEnum(str, Enum):
    HOME = "home"
    OFFICE = "office"
    STORAGE = "storage"
    OTHER = "other"


class RoleEnum(str, Enum):
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"


class EntityTypeEnum(str, Enum):
    ALBUM = "album"
    ARTIST = "artist"


class VinylStateEnum(str, Enum):
    MINT = "mint"
    NEAR_MINT = "near_mint"
    VERY_GOOD_PLUS = "very_good_plus"
    VERY_GOOD = "very_good"
    GOOD_PLUS = "good_plus"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    NOT_DEFINED = "not_defined"


class MoodEnum(str, Enum):
    HAPPY = "happy"
    SAD = "sad"
    ENERGETIC = "energetic"
    CALM = "calm"
    NOSTALGIC = "nostalgic"
    ROMANTIC = "romantic"
    MYSTERIOUS = "mysterious"
    UPLIFTING = "uplifting"
    MELANCHOLIC = "melancholic"
    POWERFUL = "powerful"


class ExternalSourceEnum(str, Enum):
    DISCOGS = "discogs"
    MUSICBRAINZ = "musicbrainz"
