from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import RoleEnum


class RoleBase(BaseModel):
    """Base schema for role data."""
    name: RoleEnum

    model_config = ConfigDict(from_attributes=True)


class RoleCreate(RoleBase):
    """Schema for creating a new role."""
    pass


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    name: Optional[RoleEnum] = None

    model_config = ConfigDict(extra="forbid")


class RoleInDB(RoleBase):
    """Schema for role data as stored in database."""
    id: int = Field(gt=0)


class RoleResponse(RoleInDB):
    """Schema for role data in API responses."""
    users_count: int = Field(default=0)


class RoleDetailResponse(RoleResponse):
    """Detailed role response including all related data."""
    users: List[dict] = Field(default_factory=list)  # Will be populated with user data 