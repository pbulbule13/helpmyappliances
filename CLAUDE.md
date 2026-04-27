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

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health
