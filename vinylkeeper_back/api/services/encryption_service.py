import base64
import os
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from api.core.logging import logger

class EncryptionService:
    def __init__(self):
        self._private_key = None
        self._public_key = None
        self._load_existing_keys()
    
    def _load_existing_keys(self):
        """Load existing RSA keys from the keys directory"""
        # Check if production keys exist first
        prod_private_path = "/home/kent1/keys/private_key.pem"
        prod_public_path = "/home/kent1/keys/public_key.pem"
        
        if os.path.exists(prod_private_path) and os.path.exists(prod_public_path):
            private_key_path = prod_private_path
            public_key_path = prod_public_path
            logger.info(f"Using production RSA keys at: {prod_private_path}")
        else:
            logger.warning(f"Production keys not found at {prod_private_path}")
            # Fallback to other locations
            key_paths = [
                ("./keys/private_key.pem", "./keys/public_key.pem"),
                ("../keys/private_key.pem", "../keys/public_key.pem")
            ]
            
            private_key_path = None
            public_key_path = None
            
            for priv_path, pub_path in key_paths:
                if os.path.exists(priv_path) and os.path.exists(pub_path):
                    private_key_path = priv_path
                    public_key_path = pub_path
                    logger.warning(f"Using fallback RSA keys at: {priv_path} - THESE MAY NOT BE THE PRODUCTION KEYS!")
                    break
            
            if not private_key_path or not public_key_path:
                raise FileNotFoundError("RSA keys not found. Production keys should be at /home/kent1/keys/")
        
        try:
            # Load private key
            with open(private_key_path, 'rb') as f:
                self._private_key = serialization.load_pem_private_key(
                    f.read(),
                    password=None,
                    backend=default_backend()
                )
            
            # Load public key
            with open(public_key_path, 'rb') as f:
                self._public_key = serialization.load_pem_public_key(
                    f.read(),
                    backend=default_backend()
                )
            
            logger.info("Encryption keys loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load existing RSA keys from {private_key_path}: {str(e)}")
            raise
    
    def get_public_key_pem(self) -> str:
        """Return the public key in PEM format as string"""
        public_key_bytes = self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return public_key_bytes.decode('utf-8')
    
    def decrypt_password(self, encrypted_password_b64: str) -> str:
        """Decrypt a base64 encoded encrypted password"""
        try:
            # Decode from base64
            encrypted_data = base64.b64decode(encrypted_password_b64)
            
            # Decrypt using private key
            decrypted_data = self._private_key.decrypt(
                encrypted_data,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            return decrypted_data.decode('utf-8')
        
        except Exception as e:
            logger.error(f"Failed to decrypt password: {str(e)}")
            raise ValueError("Invalid encrypted password")

# Singleton instance
encryption_service = EncryptionService() 