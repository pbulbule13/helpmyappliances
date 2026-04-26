import uuid
from datetime import datetime

from pydantic import BaseModel


class DeviceDocumentResponse(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    doc_type: str
    title: str
    source_url: str
    fetched_at: datetime

    model_config = {"from_attributes": True}


class DeviceDocumentListResponse(BaseModel):
    documents: list[DeviceDocumentResponse]
    total: int


class DocumentSearchRequest(BaseModel):
    query: str
    device_id: uuid.UUID | None = None
    doc_type: str | None = None
    limit: int = 10


class DocumentSearchResult(BaseModel):
    document: DeviceDocumentResponse
    relevance_score: float
    snippet: str
