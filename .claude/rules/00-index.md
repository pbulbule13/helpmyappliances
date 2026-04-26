# Rule Index — [Your Project Name]

<!-- [CHANGE] Update project name above -->

## Project Document to Rule Mapping

| Project Doc | Corresponding Rules |
|-------------|---------------------|
| `CLAUDE.md` | All rules (master reference) |
| `docs/PRD.md` | 08-security (roles), 16-billing (optional), 17-admin (optional), 19-interfaces |
| `docs/ARCHITECTURE.md` | 01-architecture, 02-backend, 03-frontend |
| `docs/DB_SCHEMA.md` | 04-database |
| `docs/API_SPEC.md` | 02-backend (endpoints) |
| `docs/DEPLOYMENT.md` | 10-ops |

---

## Rule Files (26 total)

| # | File | Domain | Key Concerns | Reusability |
|---|------|--------|--------------|-------------|
| 00 | index.md | Index | Maps docs to rules | ✓ Generic |
| 01 | architecture.md | Structure | Layers, multi-tenant patterns | ✓ Generic |
| 02 | backend.md | Backend | Services, repos, endpoints | [CHANGE] per framework |
| 03 | frontend.md | Frontend | Components, hooks, API client | [CHANGE] per framework |
| 04 | database.md | Database | Schema, tenant scoping, migrations | [CHANGE] per DB |
| 05 | caching.md | Caching | Patterns, TTL, strategies | [CHANGE] per cache |
| 06 | rag.md | AI/RAG | Embeddings, vector search | [CHANGE] or remove |
| 07 | agents.md | AI Agents | Orchestration, function calling | [CHANGE] or remove |
| 08 | security.md | Auth/Authz | JWT, roles, validation | ✓ Generic |
| 09 | testing.md | Tests | Unit, integration, factories | ✓ Generic |
| 10 | ops.md | DevOps | Docker, cloud, CI/CD | [CHANGE] per cloud |
| 11 | response-style.md | AI Output | Tone, citations | [CHANGE] or remove |
| 12 | voice.md | Voice | STT/TTS integration | [CHANGE] or remove |
| 13 | video.md | Video | WebRTC, rooms | [CHANGE] or remove |
| 14 | observability.md | Monitoring | Logs, metrics, traces | ✓ Generic |
| 15 | prompt-logging.md | AI Tracking | Request logging | [CHANGE] or remove |
| 16 | billing.md | Billing | Usage events, payments | [CHANGE] or remove |
| 17 | admin-dashboard.md | Admin UI | Analytics, management | ✓ Generic patterns |
| 18 | prompt-persistence.md | Prompts | Save prompts to history | ✓ Generic |
| 19 | interfaces.md | Interfaces | Multi-interface patterns | ✓ Generic |
| 20 | omnichannel.md | Channels | External communication | [CHANGE] or remove |
| 21 | ticketing.md | Ticketing | Routing, SLA, automation | [CHANGE] or remove |
| 22 | integrations.md | Integrations | External APIs, webhooks, SDK | ✓ Generic patterns |
| 23 | code-coverage.md | Code Coverage | 100% coverage requirements, testing standards | ✓ Generic |
| 24 | test-organization.md | Test Structure | Test folder organization, clean test structure | ✓ Generic |
| 25 | documentation.md | Documentation | Documentation standards, HTML generation | ✓ Generic |

---

## Core Principles

1. **Clean Architecture** — each layer has one job; never skip layers
2. **Multi-Tenant Safety** — every query MUST scope by `organization_id`
3. **Three Interfaces** — Admin (web), User (web), Mobile (native)
4. **Secure by Default** — auth middleware, no secrets in code
5. **Observable** — structured logs, usage_events for billing
6. **No Hallucination** — RAG responses cite sources

---

## Technology Stack (Template)

<!-- [CHANGE] Update for your actual tech stack -->

| Layer | Options | Example |
|-------|---------|---------|
| **Frontend (Web)** | React/Next.js/Vue/Angular | Next.js 14+, TypeScript, Tailwind CSS |
| **Frontend (Mobile)** | React Native/Flutter/Native | React Native or Native iOS/Android |
| **Backend** | Node.js/Python/Java/Go | FastAPI, Express, Django, Spring Boot |
| **Database** | PostgreSQL/MySQL/MongoDB | PostgreSQL 16 with Alembic |
| **Cache/Queue** | Redis/Memcached/RabbitMQ | Redis 7 |
| **AI** (optional) | OpenAI/Anthropic/Open Source | OpenAI API, Claude API |
| **Infra** | AWS/GCP/Azure/Self-hosted | Docker, AWS (ECS, RDS) |

---

## User Roles (Example)

<!-- [CHANGE] Define your own user roles -->

**Simple (2 roles):**
| Role | Scope |
|------|-------|
| `admin` | Full system access |
| `user` | Standard user access |

**Multi-tenant (3+ roles):**
| Role | Scope |
|------|-------|
| `admin` | Platform-wide admin |
| `org_owner` | Organization owner |
| `org_member` | Organization member |
