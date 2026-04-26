# Backend Rules — FastAPI

## Framework Standards

- **FastAPI** with async endpoints where I/O bound
- **Pydantic v2** for all request/response schemas
- **SQLAlchemy 2.0** async ORM
- **Alembic** for migrations

## API Design

```python
# Route structure
@router.post("/", response_model=DocumentResponse, status_code=201)
async def create_document(
    request: DocumentCreate,
    org_id: UUID = Depends(get_current_org),
    service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    return await service.create(org_id, request)
```

## Rules

1. **All routes under `/api/v1/`**
2. **Use dependency injection** for services and DB sessions
3. **Never access DB directly in routes** — use services
4. **Validate all inputs** with Pydantic schemas
5. **Return consistent error responses**:
   ```json
   {"error": {"code": "VALIDATION_ERROR", "message": "..."}}
   ```
6. **Use proper HTTP status codes**:
   - 200: Success
   - 201: Created
   - 204: No content (delete)
   - 400: Bad request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not found
   - 422: Validation error
   - 500: Server error

## Service Pattern

```python
class DocumentService:
    def __init__(self, repo: DocumentRepository, embeddings: EmbeddingsService):
        self.repo = repo
        self.embeddings = embeddings

    async def create(self, org_id: UUID, data: DocumentCreate) -> Document:
        # Business logic here
        doc = await self.repo.create(org_id, data)
        await self.embeddings.index(doc)
        return doc
```

## Repository Pattern

```python
class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, org_id: UUID, doc_id: UUID) -> Document | None:
        # ALWAYS scope by org_id
        stmt = select(Document).where(
            Document.organization_id == org_id,
            Document.id == doc_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

## Error Handling

```python
# Custom exceptions
class NotFoundError(Exception):
    pass

class PermissionDeniedError(Exception):
    pass

# Exception handlers registered globally
@app.exception_handler(NotFoundError)
async def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"error": {"code": "NOT_FOUND", "message": str(exc)}})
```

## Background Tasks

- Use Redis + Celery/ARQ for async jobs
- Never block HTTP response for long operations
- Log job start/completion to `agent_runs` table

## API Endpoints (as per API_SPEC.md)

```python
# Auth
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

# Organizations
GET  /api/v1/organizations
POST /api/v1/organizations

# Knowledge Base
POST /api/v1/kb/upload
POST /api/v1/kb/index
GET  /api/v1/kb/documents

# Chat / RAG
POST /api/v1/chat/query

# Agents
POST /api/v1/agents/run

# Admin
GET  /api/v1/admin/usage
```
