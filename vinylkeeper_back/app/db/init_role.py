from sqlalchemy.orm import Session
from app.models.role_model import Role
from app.core.enums import RoleEnum
from app.db.session import get_db
from app.core.logging import logger


def insert_default_roles() -> None:
    """Insert default roles into the database if they don't exist."""
    db = next(get_db())
    try:
        # Define the roles in the correct order (1: ADMIN, 2: USER, 3: MODERATOR)
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