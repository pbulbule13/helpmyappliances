# Billing & Usage Analytics Rules

## Architecture (as per PRD.md)

```
┌─────────────────────────────────────────────────┐
│              Usage Events                        │
│   (append-only log of all billable actions)     │
├─────────────────────────────────────────────────┤
│         Billing Service                          │
│   (aggregation, Stripe sync, invoicing)         │
├─────────────────────────────────────────────────┤
│         Stripe Integration                       │
│   (customers, subscriptions, payments)          │
└─────────────────────────────────────────────────┘
```

## Usage Events Table

```sql
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    event_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_events_org_type_created
    ON usage_events(organization_id, event_type, created_at);
```

## Event Types

| Event Type | Description | Quantity Unit |
|------------|-------------|---------------|
| `ai_tokens` | OpenAI API tokens used | tokens |
| `kb_upload` | Document uploaded | count |
| `kb_storage_mb` | Storage used | megabytes |
| `chat_message` | Chat message sent | count |
| `agent_run` | Agent execution | count |
| `voice_minutes` | Voice call duration | minutes |
| `video_minutes` | Video call duration | minutes |

## Logging Usage

```python
async def log_usage(
    org_id: UUID,
    event_type: str,
    quantity: int = 1,
    metadata: dict | None = None
):
    event = UsageEvent(
        organization_id=org_id,
        event_type=event_type,
        quantity=quantity,
        metadata=metadata or {}
    )
    await usage_repo.create(event)

# Usage examples
await log_usage(org_id, "ai_tokens", quantity=1500, metadata={"model": "gpt-4o"})
await log_usage(org_id, "kb_upload", metadata={"document_id": str(doc.id)})
await log_usage(org_id, "voice_minutes", quantity=5, metadata={"call_id": str(call.id)})
```

## Billing Customers

```python
class BillingService:
    async def get_or_create_customer(self, org_id: UUID) -> BillingCustomer:
        customer = await billing_repo.get_by_org(org_id)
        if not customer:
            org = await org_repo.get(org_id)
            stripe_customer = await stripe.customers.create(
                email=org.billing_email,
                metadata={"organization_id": str(org_id)}
            )
            customer = await billing_repo.create(
                organization_id=org_id,
                stripe_customer_id=stripe_customer.id
            )
        return customer
```

## Usage Aggregation

```python
async def get_usage_summary(org_id: UUID, start: date, end: date) -> dict:
    result = await db.execute("""
        SELECT
            event_type,
            SUM(quantity) as total,
            COUNT(*) as event_count
        FROM usage_events
        WHERE organization_id = :org_id
          AND created_at >= :start
          AND created_at < :end
        GROUP BY event_type
    """, {"org_id": org_id, "start": start, "end": end})
    return {row.event_type: row.total for row in result}
```

## Admin Usage Endpoint

```python
# GET /api/v1/admin/usage
@router.get("/admin/usage")
async def get_platform_usage(
    auth: AuthContext = Depends(require_role("admin")),
    start_date: date = Query(...),
    end_date: date = Query(...)
) -> UsageReport:
    return await billing_service.get_platform_usage(start_date, end_date)
```

## Rules

1. **Append-only** — never update or delete usage_events
2. **Log at point of action** — don't batch or defer logging
3. **Include metadata** — for debugging and detailed reports
4. **Tenant scoped** — always include organization_id
5. **Idempotent Stripe sync** — handle webhook retries gracefully
