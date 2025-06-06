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


