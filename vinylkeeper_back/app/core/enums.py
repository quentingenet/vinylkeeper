from enum import Enum


class ModerationStatusEnum(str, Enum):
    PENDING = "Pending"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


class PlaceTypeEnum(str, Enum):
    SHOP = "Shop"
    VENUE = "Venue"
    RECORD_STORE = "Record Store"
    OTHER = "Other"
    BROCANT = "Brocant"


class RoleEnum(str, Enum):
    ADMIN = "Admin"
    USER = "User"
    MODERATOR = "Moderator"


class EntityTypeEnum(str, Enum):
    ALBUM = "ALBUM"
    ARTIST = "ARTIST"


class VinylStateEnum(str, Enum):
    MINT = "Mint"
    NEAR_MINT = "Near Mint"
    VERY_GOOD = "Very Good"
    GOOD = "Good"
    FAIR = "Fair"
    POOR = "Poor"


class MoodEnum(str, Enum):
    HAPPY = "Happy"
    SAD = "Sad"
    EXCITED = "Excited"
    CALM = "Calm"
    ANGRY = "Angry"
    RELAXED = "Relaxed"
    ENERGETIC = "Energetic"
    MELANCHOLIC = "Melancholic"
    LONELY = "Lonely"
    IN_LOVE = "In Love"
    HEARTBROKEN = "Heartbroken"
    NOSTALGIC = "Nostalgic"
    HOPEFUL = "Hopeful"
    BITTERSWEET = "Bittersweet"
    PEACEFUL = "Peaceful"
    ANXIOUS = "Anxious"
    CONFIDENT = "Confident"
    HYPED = "Hyped"
    FOCUSED = "Focused"
    POWERFUL = "Powerful"
    MOTIVATED = "Motivated"
    RESTLESS = "Restless"
    DREAMY = "Dreamy"
    MYSTERIOUS = "Mysterious"
    SOMBRE = "Sombre"
    CHILLED = "Chilled"
    LATE_NIGHT = "Late Night"
    PARTY = "Party"
    FLIRTATIOUS = "Flirtatious"
    SOCIABLE = "Sociable"
    ROMANTIC = "Romantic"


class ExternalSourceEnum(str, Enum):
    DEEZER = "DEEZER"
    SPOTIFY = "SPOTIFY"
    MUSICBRAINZ = "MUSICBRAINZ"
    DISCOGS = "DISCOGS"
    LAST_FM = "LASTFM"
