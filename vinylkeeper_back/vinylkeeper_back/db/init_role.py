from sqlalchemy.orm import Session
from vinylkeeper_back.models.role_model import Role, RoleEnum
from vinylkeeper_back.db.session import get_db
from vinylkeeper_back.core.logging import logger

def insert_default_roles():
    db = next(get_db())
    try:

        admin_role = db.query(Role).filter_by(name=RoleEnum.ADMIN).first()
        user_role = db.query(Role).filter_by(name=RoleEnum.USER).first()
        
        if not admin_role:
            admin_role = Role(name=RoleEnum.ADMIN)
            db.add(admin_role)
            logger.info("Admin role inserted successfully")
        
        if not user_role:
            user_role = Role(name=RoleEnum.USER)
            db.add(user_role)
            logger.info("User role inserted successfully")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    insert_default_roles()