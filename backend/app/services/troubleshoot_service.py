"""Service for AI-powered appliance troubleshooting."""

import uuid
from collections.abc import AsyncGenerator

import structlog

from app.models.troubleshoot_session import TroubleshootSession
from app.repositories.session_repository import SessionRepository
from app.repositories.document_repository import DocumentRepository
from app.services.euri_client import chat_completion_stream, generate_embedding
from app.core.exceptions import NotFoundError

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are an expert appliance repair technician assistant for HelpMyAppliances.
Your role is to help users troubleshoot and fix their home appliances step by step.

IMPORTANT SAFETY RULES:
- Always warn about electrical hazards before suggesting work on electrical components
- Always recommend disconnecting power before any repair work
- For gas appliances, always recommend calling a licensed professional for gas-related issues
- For refrigerant issues, always recommend a certified HVAC technician
- If the user describes a situation that could be dangerous, prioritize safety over repair

GUIDELINES:
- Ask clarifying questions to narrow down the problem
- Provide step-by-step instructions with clear, simple language
- Suggest the most common/likely cause first
- Reference specific parts by name and part number when available
- Recommend tools needed for each step
- Estimate difficulty level (easy/medium/hard) for each repair
- When possible, include cost estimates for replacement parts
- If the repair is beyond DIY, recommend professional help

When documentation context is provided, use it to give more specific and accurate advice.
Always cite your sources when using documentation."""


class TroubleshootService:
    def __init__(
        self,
        session_repo: SessionRepository,
        doc_repo: DocumentRepository,
    ):
        self.session_repo = session_repo
        self.doc_repo = doc_repo

    async def create_session(
        self, device_id: uuid.UUID, user_id: uuid.UUID, problem_summary: str
    ) -> TroubleshootSession:
        session = await self.session_repo.create(device_id, user_id, problem_summary)
        # Add initial system context as a system message
        await self.session_repo.add_message(
            session_id=session.id,
            role="system",
            content=SYSTEM_PROMPT,
        )
        logger.info(
            "troubleshoot_session_created",
            session_id=str(session.id),
            device_id=str(device_id),
        )
        return session

    async def get_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> TroubleshootSession:
        session = await self.session_repo.get_by_id(session_id, user_id)
        if not session:
            raise NotFoundError("Troubleshooting session")
        return session

    async def list_sessions(
        self, device_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[list[TroubleshootSession], int]:
        return await self.session_repo.list_by_device(device_id, user_id)

    async def send_message_stream(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        content: str,
        device_id: uuid.UUID | None = None,
    ) -> AsyncGenerator[str, None]:
        """Send a user message and stream the AI response."""
        session = await self.get_session(session_id, user_id)

        # Save user message
        await self.session_repo.add_message(
            session_id=session_id,
            role="user",
            content=content,
        )

        # Build context from device documents via RAG
        rag_context = ""
        if device_id:
            rag_context = await self._get_rag_context(content, device_id)

        # Build messages for AI
        messages = await self._build_messages(session_id, rag_context, content)

        # Stream response
        full_response = ""
        async for chunk in chat_completion_stream(messages):
            full_response += chunk
            yield chunk

        # Save assistant response
        await self.session_repo.add_message(
            session_id=session_id,
            role="assistant",
            content=full_response,
        )
        logger.info(
            "troubleshoot_response_sent",
            session_id=str(session_id),
            response_length=len(full_response),
        )

    async def _get_rag_context(self, query: str, device_id: uuid.UUID) -> str:
        """Retrieve relevant documentation for the query."""
        try:
            embedding = await generate_embedding(query)
            results = await self.doc_repo.search_by_embedding(
                embedding, device_id=device_id, limit=3
            )
            if not results:
                return ""

            context_parts = []
            for doc, score in results:
                if score > 0.5 and doc.extracted_text:
                    context_parts.append(
                        f"[Source: {doc.title}]\n{doc.extracted_text[:1000]}"
                    )
            return "\n\n".join(context_parts)
        except Exception as e:
            logger.warning("rag_context_failed", error=str(e))
            return ""

    async def _build_messages(
        self, session_id: uuid.UUID, rag_context: str, current_query: str
    ) -> list[dict]:
        """Build the message list for the AI, including history and RAG context."""
        messages_db = await self.session_repo.get_messages(session_id)

        messages = []
        for msg in messages_db:
            if msg.role == "system" and rag_context:
                # Inject RAG context into system message
                messages.append({
                    "role": "system",
                    "content": f"{msg.content}\n\n--- DEVICE DOCUMENTATION ---\n{rag_context}",
                })
            else:
                messages.append({"role": msg.role, "content": msg.content})

        # Trim to last 20 messages to stay within context window
        if len(messages) > 22:
            system_msg = messages[0]
            messages = [system_msg] + messages[-20:]

        return messages

    async def resolve_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID, resolution: dict | None = None
    ) -> TroubleshootSession:
        session = await self.get_session(session_id, user_id)
        return await self.session_repo.update_status(session, "resolved", resolution)
