from enum import Enum

class ModerationStatusEnum(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"

