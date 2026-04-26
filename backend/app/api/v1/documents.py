import uuid

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.core.dependencies import get_document_search_service, get_document_repo
from app.models.user import User
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import (
    DeviceDocumentResponse,
    DeviceDocumentListResponse,
    DocumentSearchRequest,
    DocumentSearchResult,
)
from app.services.document_search_service import DocumentSearchService

router = APIRouter()


@router.get("/device/{device_id}", response_model=DeviceDocumentListResponse)
async def list_device_documents(
    device_id: uuid.UUID,
    doc_type: str | None = None,
    current_user: User = Depends(get_current_user),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> DeviceDocumentListResponse:
    """List all documents for a device."""
    docs = await doc_repo.get_by_device(device_id, doc_type)
    return DeviceDocumentListResponse(
        documents=[DeviceDocumentResponse.model_validate(d) for d in docs],
        total=len(docs),
    )


@router.post("/search", response_model=list[DocumentSearchResult])
async def search_documents(
    data: DocumentSearchRequest,
    current_user: User = Depends(get_current_user),
    service: DocumentSearchService = Depends(get_document_search_service),
) -> list[DocumentSearchResult]:
    """Semantic search across device documentation."""
    return await service.search(
        query=data.query,
        device_id=data.device_id,
        limit=data.limit,
    )
