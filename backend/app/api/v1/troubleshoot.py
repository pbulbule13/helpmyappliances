import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user
from app.core.dependencies import get_troubleshoot_service
from app.models.user import User
from app.schemas.troubleshoot import (
    SessionCreate,
    SessionResponse,
    SessionListResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
)
from app.services.troubleshoot_service import TroubleshootService

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    service: TroubleshootService = Depends(get_troubleshoot_service),
) -> SessionResponse:
    """Start a new troubleshooting session for a device."""
    session = await service.create_session(
        device_id=data.device_id,
        user_id=current_user.id,
        problem_summary=data.problem_summary,
    )
    return SessionResponse.model_validate(session)


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: TroubleshootService = Depends(get_troubleshoot_service),
) -> SessionListResponse:
    """List troubleshooting sessions for a device."""
    sessions, total = await service.list_sessions(device_id, current_user.id)
    return SessionListResponse(
        sessions=[SessionResponse.model_validate(s) for s in sessions],
        total=total,
    )


@router.get("/sessions/{session_id}", response_model=ChatHistoryResponse)
async def get_session_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: TroubleshootService = Depends(get_troubleshoot_service),
) -> ChatHistoryResponse:
    """Get full chat history for a troubleshooting session."""
    session = await service.get_session(session_id, current_user.id)
    messages = [
        ChatMessageResponse.model_validate(m)
        for m in session.messages
        if m.role != "system"
    ]
    return ChatHistoryResponse(
        session=SessionResponse.model_validate(session),
        messages=messages,
    )


@router.post("/sessions/{session_id}/message")
async def send_message(
    session_id: uuid.UUID,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    service: TroubleshootService = Depends(get_troubleshoot_service),
) -> StreamingResponse:
    """Send a message and get a streaming AI response via SSE."""
    session = await service.get_session(session_id, current_user.id)

    async def event_stream():
        async for chunk in service.send_message_stream(
            session_id=session_id,
            user_id=current_user.id,
            content=data.content,
            device_id=session.device_id,
        ):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/sessions/{session_id}/resolve", response_model=SessionResponse)
async def resolve_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: TroubleshootService = Depends(get_troubleshoot_service),
) -> SessionResponse:
    """Mark a troubleshooting session as resolved."""
    session = await service.resolve_session(session_id, current_user.id)
    return SessionResponse.model_validate(session)
