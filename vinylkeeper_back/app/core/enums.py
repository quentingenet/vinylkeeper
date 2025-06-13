from enum import Enum


class ModerationStatusEnum(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class PlaceTypeEnum(str, Enum):
    shop = "shop"
    venue = "venue"
    record_store = "record_store"
    other = "other"
    brocant = "brocant"


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
