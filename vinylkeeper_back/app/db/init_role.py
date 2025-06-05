from sqlalchemy.orm import Session
from app.models.role_model import Role
from app.core.enums import RoleEnum
from app.db.session import get_db
from app.core.logging import logger


def insert_default_roles() -> None:
    """Insert default roles into the database if they don't exist."""
    db = next(get_db())
    try:
        # Check if all roles are already present in the database
        existing_roles = db.query(Role).filter(
            Role.name.in_([role for role in RoleEnum])).all()
        if len(existing_roles) == len(RoleEnum):
            logger.info("All default roles are already in database.")
            return

        # If some roles are missing, insert them
        default_roles = [
            (RoleEnum.ADMIN, "Administrator role"),
            (RoleEnum.USER, "Regular user role"),
            (RoleEnum.MODERATOR, "Moderator role")
        ]

        for role_enum, description in default_roles:
            role = db.query(Role).filter_by(name=role_enum).first()
            if not role:
                role = Role(name=role_enum)
                db.add(role)
                logger.info(f"{description} inserted successfully")

        db.commit()
        logger.info("All default roles have been initialized successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Error initializing roles: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    insert_default_roles()
