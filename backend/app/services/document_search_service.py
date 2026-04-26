"""Service for searching device documentation via embeddings."""

import uuid

import structlog

from app.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentSearchResult, DeviceDocumentResponse
from app.services.euri_client import generate_embedding

logger = structlog.get_logger()


class DocumentSearchService:
    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def search(
        self,
        query: str,
        device_id: uuid.UUID | None = None,
        limit: int = 10,
    ) -> list[DocumentSearchResult]:
        """Semantic search across device documentation."""
        try:
            embedding = await generate_embedding(query)
            results = await self.doc_repo.search_by_embedding(
                embedding, device_id=device_id, limit=limit
            )

            search_results = []
            for doc, score in results:
                snippet = (doc.extracted_text or "")[:200]
                search_results.append(
                    DocumentSearchResult(
                        document=DeviceDocumentResponse.model_validate(doc),
                        relevance_score=score,
                        snippet=snippet,
                    )
                )

            return search_results
        except Exception as e:
            logger.error("document_search_failed", error=str(e))
            return []
