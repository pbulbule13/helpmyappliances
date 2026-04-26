# Architecture Rules — [Your Project Name]

<!-- [CHANGE] Update project name or keep generic -->

## Layer Hierarchy (strictly enforced)

```
┌─────────────────────────────────────────┐
│  Presentation (Next.js / API Routes)   │
├─────────────────────────────────────────┤
│  Application Services                   │
├─────────────────────────────────────────┤
│  Domain / Business Logic                │
├─────────────────────────────────────────┤
│  Repositories / Data Access             │
├─────────────────────────────────────────┤
│  Infrastructure (DB, Redis, AWS, APIs)  │
└─────────────────────────────────────────┘
```

## Core Principles

### 1. Documentation-First Approach ⭐

**CRITICAL:** Changes must align with documentation BEFORE implementation.

Before writing code, ensure alignment with:
- `docs/PRD.md` - Product requirements and features
- `docs/ARCHITECTURE.md` - System architecture and design
- `docs/API_SPEC.md` - API contracts and endpoints
- `docs/DB_SCHEMA.md` - Database schema and relationships
- `docs/DEPLOYMENT.md` - Deployment and infrastructure

**Process:**
1. Review relevant documentation
2. Update docs if requirements change
3. Implement code following documented patterns
4. Keep docs in sync with code

**Why:** Prevents architectural drift, maintains team alignment, enables onboarding

---

### 2. Layer Hierarchy Rules

1. **Never skip layers** — Controllers call Services, Services call Repositories
2. **No business logic in controllers** — Controllers handle HTTP only
3. **No database calls in services** — Use repositories for all data access
4. **Dependency injection** — Pass dependencies explicitly, no global imports of DB sessions
5. **Single responsibility** — Each module does one thing well

---

### 3. Feature Mapping (if using PRD)

**Rule:** Every feature implementation must map to PRD feature list

- Reference PRD feature IDs in code comments where applicable
- Ensure new features are documented in PRD before coding
- Remove deprecated PRD features from codebase when features sunset

**Example:**
```python
# PRD Feature 2.3: Smart ticket routing
class TicketRoutingService:
    async def route_ticket(self, ticket: Ticket) -> Agent:
        # Implementation...
```

## Directory Structure

<!-- [CHANGE] Update for your tech stack -->

**Backend Example (Python/FastAPI):**
```
backend/
├── api/v1/
│   ├── routes/          # HTTP handlers
│   └── dependencies/    # Framework dependencies
├── services/            # Business logic
├── repositories/        # Data access
├── models/              # Database models
├── schemas/             # Request/response schemas
├── core/                # Config, security
└── infrastructure/      # External integrations
```

**Frontend Example (Next.js):**
```
frontend/
├── app/                 # App router (or pages/)
├── components/          # React components
├── hooks/               # Custom hooks
├── lib/                 # Utilities
├── services/            # API client
└── types/               # TypeScript types
```

**Adapt based on your framework (Express, Django, Vue, etc.)**

## Application Layers (Generic)

<!-- [CHANGE] Customize based on your application architecture -->

```
┌──────────────────────────────────────────────────────┐
│           Presentation Layer (UI/API)                 │
├──────────────────────────────────────────────────────┤
│           Application Services Layer                  │
├──────────────────────────────────────────────────────┤
│           Domain / Business Logic Layer               │
├──────────────────────────────────────────────────────┤
│           Data Access / Repository Layer              │
├──────────────────────────────────────────────────────┤
│           Infrastructure Layer (DB, Cache, APIs)      │
└──────────────────────────────────────────────────────┘
```

## Multi-Tenant Isolation (if applicable)

<!-- [CHANGE] Remove this section if building single-tenant application -->

**Critical Security Pattern:**

- Every request carries `organization_id` / `tenant_id` from authentication
- **ALL queries MUST filter by tenant identifier**
- Never expose data across tenants
- Validate tenant membership before any operation

**Anti-Pattern (Security Vulnerability):**
```python
# WRONG - No tenant scoping!
item = db.query(Item).filter(Item.id == item_id).first()
```

**Correct Pattern:**
```python
# CORRECT - Always scope by tenant
item = db.query(Item).filter(
    Item.organization_id == current_org_id,
    Item.id == item_id
).first()
```

---

## Consistency & Modularity

**Prefer:**
- Composable modules over monolithic files
- Consistent naming conventions across codebase
- Small, focused functions/methods
- Reusable utilities for common patterns

**Avoid:**
- Duplicating logic without justified abstraction
- Mixing unrelated concerns in same module
- Breaking changes without migration path
- Hardcoded configuration values

---

## Production-Ready Standards ⭐

**CRITICAL:** Produce production-oriented code, never demo-only implementations

This is not a prototype - every line of code must meet production quality standards.

### Required Practices

1. **Small, Composable Modules**
   - Keep files under 300 lines where possible
   - One class/major function per file
   - Prefer composition over large monolithic modules

2. **Type Hints Throughout Stack**
   - TypeScript for frontend (strict mode)
   - Python type hints for all function signatures
   - No `any` types in TypeScript, no untyped functions in Python

3. **Robust Error Handling**
   - Handle error cases, not just happy path
   - Proper exception types with meaningful messages
   - Never silent failures or generic try/catch blocks
   - Log errors with context for debugging

4. **Structured Logging on Critical Paths**
   - JSON-formatted logs in production
   - Include request IDs, user context, operation names
   - No PII in logs (see 14-observability.md)

5. **Environment-Based Configuration**
   - No hardcoded values (URLs, ports, credentials)
   - Use environment variables or config files
   - Different configs for dev/staging/prod

6. **Comprehensive Testing**
   - Unit tests for business logic
   - Integration tests for workflows
   - See 09-testing.md, 23-code-coverage.md

### Prohibited Practices

**Never in production code:**
- ❌ Demo-only or prototype implementations
- ❌ Hardcode secrets, credentials, or API keys
- ❌ "TODO: fix later" comments without tickets
- ❌ Skip error handling for edge cases
- ❌ Large files (>500 lines) without refactoring
- ❌ Untyped code (missing type hints)
- ❌ Print statements instead of structured logging
- ❌ Shortcuts that sacrifice maintainability

---

## Code Placement

**Golden Rule:** New code goes in the correct architectural layer

- **Routes/Controllers:** HTTP request handling only
- **Services:** Business logic and orchestration
- **Repositories:** Database queries and data access
- **Models:** Data structures and domain entities
- **Utilities:** Reusable helper functions
- **Infrastructure:** External API integrations

**Anti-Pattern:** Don't put code in arbitrary locations or violate layer boundaries
