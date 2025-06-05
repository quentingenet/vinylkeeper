from fastapi import APIRouter, HTTPException
from app.services.encryption_service import encryption_service
from app.core.logging import logger

router = APIRouter()

@router.get("/public-key")
async def get_public_key():
    """Get the public RSA key for password encryption"""
    try:
        public_key = encryption_service.get_public_key_pem()
        return {"public_key": public_key}
    except Exception as e:
        logger.error(f"Error retrieving public key: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to retrieve public key") 