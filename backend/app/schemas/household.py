import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class HouseholdCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class HouseholdUpdate(BaseModel):
    name: str | None = None


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HouseholdListResponse(BaseModel):
    households: list[HouseholdResponse]


class HouseholdMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}
