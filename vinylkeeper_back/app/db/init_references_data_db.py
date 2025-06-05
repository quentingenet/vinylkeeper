from sqlalchemy.orm import Session
from app.models.reference_data.roles import Role
from app.models.reference_data.moderation_statuses import ModerationStatus
from app.models.reference_data.place_types import PlaceType
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.vinyl_state import VinylState
from app.models.reference_data.moods import Mood
from app.models.reference_data.external_sources import ExternalSource

from app.core.enums import (
    RoleEnum,
    ModerationStatusEnum,
    PlaceTypeEnum,
    EntityTypeEnum,
    VinylStateEnum,
    MoodEnum,
    ExternalSourceEnum,
)


def insert_reference_values(db: Session):
    def insert_enum_values(model, enum_class):
        for value in enum_class:
            exists = db.query(model).filter_by(name=value.value).first()
            if not exists:
                db.add(model(name=value.value))
        db.commit()

    insert_enum_values(Role, RoleEnum)
    insert_enum_values(ModerationStatus, ModerationStatusEnum)
    insert_enum_values(PlaceType, PlaceTypeEnum)
    insert_enum_values(EntityType, EntityTypeEnum)
    insert_enum_values(VinylState, VinylStateEnum)
    insert_enum_values(Mood, MoodEnum)
    insert_enum_values(ExternalSource, ExternalSourceEnum)
