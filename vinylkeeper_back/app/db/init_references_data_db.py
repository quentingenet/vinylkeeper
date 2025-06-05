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

VINYL_STATE_DESCRIPTIONS = {
    "mint": "Perfect. No signs of wear. May be sealed and unplayed.",
    "near_mint": "Nearly perfect. Played rarely, if at all. No visible scratches or defects.",
    "very_good_plus": "Well-cared-for. Minor surface wear or light scuffs. Plays cleanly.",
    "very_good": "Noticeable wear and light surface noise. Still enjoyable listening.",
    "good_plus": "Significant wear, scratches, or noise. Plays through but not pristine.",
    "good": "Heavy wear, loud surface noise. May have noticeable skips or groove wear.",
    "fair": "Extensive damage. May skip or repeat. Suitable mostly as a placeholder.",
    "poor": "Unplayable or broken. Collector's item only or for parts.",
    "not_defined": "Condition not specified. Use when the vinyl's state is unknown."
}


def check_reference_data_exists(db: Session) -> bool:
    reference_models = [
        Role, ModerationStatus, PlaceType,
        EntityType, VinylState, 
        Mood, ExternalSource
    ]
    return all(db.query(model).first() for model in reference_models)


def insert_enum_values(db: Session, model, enum_class, descriptions: dict = None):
    for value in enum_class:
        if not db.query(model).filter_by(name=value.value).first():
            kwargs = {"name": value.value}
            if descriptions and value.value in descriptions:
                kwargs["description"] = descriptions[value.value]
            db.add(model(**kwargs))


def insert_reference_values(db: Session):
    try:
        insert_enum_values(db, Role, RoleEnum)
        insert_enum_values(db, ModerationStatus, ModerationStatusEnum)
        insert_enum_values(db, PlaceType, PlaceTypeEnum)
        insert_enum_values(db, EntityType, EntityTypeEnum)
        insert_enum_values(db, VinylState, VinylStateEnum, VINYL_STATE_DESCRIPTIONS)
        insert_enum_values(db, Mood, MoodEnum)
        insert_enum_values(db, ExternalSource, ExternalSourceEnum)
        db.commit()
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to insert reference values: {str(e)}")
