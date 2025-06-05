from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class RoleBase(BaseModel):
    """Base schema for role data."""
    name: str = Field(
        min_length=1,
        max_length=50,
        description="Role name must be between 1 and 50 characters"
    )

    model_config = ConfigDict(from_attributes=True)


class RoleCreate(RoleBase):
    """Schema for creating a new role."""
    pass


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=50,
        description="New role name"
    )

    model_config = ConfigDict(extra="forbid")


class RoleInDB(RoleBase):
    """Schema for role data as stored in database."""
    id: int = Field(
        gt=0,
        description="Unique identifier for the role"
    )


class RoleResponse(RoleInDB):
    """Schema for role data in API responses."""
    users_count: int = Field(
        default=0,
        description="Number of users with this role"
    )


class RoleDetailResponse(RoleResponse):
    """Detailed role response including all related data."""
    users: List[dict] = Field(
        default_factory=list,
        description="List of users with this role"
    )
