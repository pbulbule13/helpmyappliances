import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.troubleshoot_session import TroubleshootSession
from app.models.chat_message import ChatMessage


class SessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> TroubleshootSession | None:
        stmt = (
            select(TroubleshootSession)
            .where(
                TroubleshootSession.id == session_id,
                TroubleshootSession.user_id == user_id,
            )
            .options(selectinload(TroubleshootSession.messages))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_device(
        self, device_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[list[TroubleshootSession], int]:
        stmt = (
            select(TroubleshootSession)
            .where(
                TroubleshootSession.device_id == device_id,
                TroubleshootSession.user_id == user_id,
            )
            .order_by(TroubleshootSession.created_at.desc())
        )
        count_stmt = (
            select(func.count())
            .select_from(TroubleshootSession)
            .where(
                TroubleshootSession.device_id == device_id,
                TroubleshootSession.user_id == user_id,
            )
        )
        result = await self.session.execute(stmt)
        count_result = await self.session.execute(count_stmt)
        return list(result.scalars().all()), count_result.scalar_one()

    async def create(
        self, device_id: uuid.UUID, user_id: uuid.UUID, problem_summary: str
    ) -> TroubleshootSession:
        ts = TroubleshootSession(
            device_id=device_id,
            user_id=user_id,
            problem_summary=problem_summary,
        )
        self.session.add(ts)
        await self.session.flush()
        return ts

    async def add_message(
        self,
        session_id: uuid.UUID,
        role: str,
        content: str,
        attachments: dict | None = None,
        token_count: int = 0,
    ) -> ChatMessage:
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            attachments=attachments,
            token_count=token_count,
        )
        self.session.add(msg)
        await self.session.flush()
        return msg

    async def get_messages(self, session_id: uuid.UUID) -> list[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(
        self, ts: TroubleshootSession, status: str, resolution: dict | None = None
    ) -> TroubleshootSession:
        ts.status = status
        if resolution:
            ts.resolution_summary = resolution
        await self.session.flush()
        return ts
