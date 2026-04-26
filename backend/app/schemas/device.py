import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class DeviceCreate(BaseModel):
    household_id: uuid.UUID
    brand: str = ""
    model_number: str = Field(..., min_length=1, max_length=255)
    serial_number: str | None = None
    category: str = "other"
    nickname: str = ""
    room: str = ""
    purchase_date: date | None = None


class DeviceUpdate(BaseModel):
    brand: str | None = None
    model_number: str | None = None
    serial_number: str | None = None
    category: str | None = None
    nickname: str | None = None
    room: str | None = None
    purchase_date: date | None = None


class DeviceResponse(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    brand: str
    model_number: str
    serial_number: str | None
    category: str
    nickname: str
    room: str
    purchase_date: date | None
    photo_url: str | None
    specifications: dict | None
    documentation_urls: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeviceListResponse(BaseModel):
    devices: list[DeviceResponse]
    total: int
