import uuid

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device_document import DeviceDocument


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_device(
        self, device_id: uuid.UUID, doc_type: str | None = None
    ) -> list[DeviceDocument]:
        stmt = select(DeviceDocument).where(DeviceDocument.device_id == device_id)
        if doc_type:
            stmt = stmt.where(DeviceDocument.doc_type == doc_type)
        stmt = stmt.order_by(DeviceDocument.fetched_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs) -> DeviceDocument:
        doc = DeviceDocument(**kwargs)
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def bulk_create(self, documents: list[dict]) -> list[DeviceDocument]:
        docs = [DeviceDocument(**d) for d in documents]
        self.session.add_all(docs)
        await self.session.flush()
        return docs

    async def search_by_embedding(
        self,
        embedding: list[float],
        device_id: uuid.UUID | None = None,
        limit: int = 5,
    ) -> list[tuple[DeviceDocument, float]]:
        """Semantic search using pgvector cosine distance."""
        stmt = (
            select(
                DeviceDocument,
                DeviceDocument.embedding.cosine_distance(embedding).label("distance"),
            )
            .where(DeviceDocument.embedding.isnot(None))
            .order_by(text("distance"))
            .limit(limit)
        )
        if device_id:
            stmt = stmt.where(DeviceDocument.device_id == device_id)

        result = await self.session.execute(stmt)
        return [(row[0], 1 - row[1]) for row in result.all()]

    async def delete_by_device(self, device_id: uuid.UUID) -> None:
        stmt = select(DeviceDocument).where(DeviceDocument.device_id == device_id)
        result = await self.session.execute(stmt)
        for doc in result.scalars().all():
            await self.session.delete(doc)
        await self.session.flush()
