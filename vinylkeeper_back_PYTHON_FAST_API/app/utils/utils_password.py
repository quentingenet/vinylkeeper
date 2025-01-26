from passlib.context import CryptContext

# Hashing context configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies that a plain password matches a hashed password.
    """
    return pwd_context.verify(plain_password, hashed_password)
