from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration for all schemas."""
    model_config = ConfigDict(from_attributes=True)


# Only expose BaseSchema and commonly used base classes
# Individual schemas should be imported explicitly from their modules

__all__ = [
    "BaseModel",
    "BaseSchema",
]
