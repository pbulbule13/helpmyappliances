import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    device_id: uuid.UUID
    problem_summary: str = Field(..., min_length=1, max_length=1000)


class SessionResponse(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    user_id: uuid.UUID
    problem_summary: str
    status: str
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    total: int


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    attachments: dict | None = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    attachments: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]
    session: SessionResponse
