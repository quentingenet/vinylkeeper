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
        private_key_path = "./keys/private_key.pem"
        public_key_path = "./keys/public_key.pem"
        
        if not os.path.exists(private_key_path) or not os.path.exists(public_key_path):
            raise FileNotFoundError("RSA keys not found in ./keys/ directory")
        
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
            logger.error(f"Failed to load RSA keys: {str(e)}")
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