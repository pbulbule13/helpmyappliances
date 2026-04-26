# Database Rules — PostgreSQL

## Mandatory Columns

Every table MUST have:

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

## Tenant Isolation (CRITICAL)

```sql
-- Every business table MUST have organization_id
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
```

```python
# CORRECT — always scope by org
db.query(Document).filter_by(organization_id=org_id, id=doc_id)

# WRONG — security vulnerability
db.query(Document).filter_by(id=doc_id)
```

## Core Schema (as per DB_SCHEMA.md)

```sql
-- Identity & Tenants
users (id, email, password_hash, name, avatar_url, created_at, updated_at)
organizations (id, name, slug, plan, settings, created_at, updated_at)
memberships (id, user_id, organization_id, role, created_by, created_at, updated_at)
sessions (id, user_id, token_hash, expires_at, created_at)

-- Knowledge Base
documents (id, organization_id, name, type, status, created_by, created_at, updated_at)
document_chunks (id, document_id, organization_id, content, chunk_index, created_at)
embeddings_metadata (id, document_id, organization_id, vector_store_id, indexed_at, status, created_at, updated_at)

-- Chat / RAG
chat_sessions (id, organization_id, user_id, channel, status, metadata, created_at, updated_at)
chat_messages (id, chat_session_id, organization_id, role, content, sources, created_at)

-- AI Agents
agent_runs (id, organization_id, chat_session_id, status, input, output, tokens_used, created_by, created_at, completed_at)

-- Billing & Usage
billing_customers (id, organization_id, stripe_customer_id, created_at, updated_at)
usage_events (id, organization_id, event_type, quantity, metadata, created_at)

-- Voice/Video (Omnichannel extension)
call_sessions (id, organization_id, chat_session_id, type, status, started_at, ended_at, recording_url, transcript_url, created_at)
```

## Permission-Sensitive Tables (Auditable)

These tables MUST include `created_by` for ownership tracking:
- `users` — system-level
- `memberships` — who added the member
- `agent_runs` — who triggered the run
- `billing_customers` — who set up billing

## Indexes

```sql
-- Always index foreign keys and common query patterns
CREATE INDEX idx_conversations_org_status ON conversations(organization_id, status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_documents_org ON documents(organization_id);
```

## Migrations

- Use Alembic for all schema changes
- Never modify production DB directly
- Migrations must be reversible
- Test rollback before deploying

```bash
alembic revision --autogenerate -m "add_call_sessions_table"
alembic upgrade head
alembic downgrade -1  # test rollback
```

## Soft Deletes (optional)

For audit-sensitive tables:
```sql
deleted_at TIMESTAMPTZ DEFAULT NULL
```

Filter in queries: `WHERE deleted_at IS NULL`
