# HelpMyAppliances — CLAUDE.md

## Project Overview
AI-powered appliance troubleshooting platform. Users photograph appliance model plates, AI extracts model numbers, retrieves documentation, and provides interactive troubleshooting.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Flutter 3.x (Dart) — Android + Web |
| Backend | Python 3.12 + FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| AI | EURI API (api.euron.one) — OpenAI-compatible |
| Auth | Firebase Authentication (Google OAuth) |
| Payments | RevenueCat (Android) + Stripe (Web) |
| Infra | GCP Cloud Run, Cloud SQL, Cloud Storage |
| CI/CD | GitHub Actions |

## Architecture Rules
See `.claude/rules/` for full rulebook. Key rules:
1. **Clean Architecture** — Controllers → Services → Repositories. Never skip layers.
2. **Documentation-First** — Update docs before code.
3. **Production-Ready** — No demo code. Type hints everywhere. Robust error handling.
4. **Modular RAG** — Separate ingestion from retrieval pipeline.
5. **Secure by Default** — Firebase JWT validation, input validation, no secrets in code.
6. **Observable** — Structured JSON logging, no PII in logs.
7. **100% scoped queries** — All queries filter by user_id or household_id.

## Directory Structure
```
helpmyappliances/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # HTTP route handlers
│   │   ├── core/            # Config, security, dependencies
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access layer
│   │   ├── infrastructure/  # External API integrations
│   │   └── workers/         # Background tasks
│   ├── alembic/             # Database migrations
│   ├── tests/               # pytest tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Flutter app
├── infra/                   # Terraform, docker-compose
├── docs/                    # Project documentation
└── .github/workflows/       # CI/CD
```

## API Design
- All routes under `/api/v1/`
- Consistent error format: `{"error": {"code": "...", "message": "..."}}`
- Use Pydantic v2 for all schemas
- Dependency injection for services
- SSE for streaming AI responses

## Key Accounts
- **GitHub:** pbulbule13 (prashilbulbule13@gmail.com)
- **GCP:** pbit82@gmail.com
- **EURI:** api.euron.one

## Commands
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload
pytest

# Frontend
cd frontend && flutter pub get
flutter run -d chrome   # web
flutter run             # android

# Docker
docker-compose up -d
```
