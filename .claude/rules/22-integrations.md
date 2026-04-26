# External Integrations Rules

## Integration Scope

| Integration | Purpose |
|-------------|---------|
| **Salesforce** | CRM sync, customer/account data, activity log |
| **HubSpot** | CRM sync, contact management |
| **Zendesk** | Ticket sync, migration, side-by-side |
| **Jira** | Issue linking, ticket-to-issue creation |
| **Slack** | Agent notifications, workflows, customer channel |
| **Microsoft Teams** | Agent notifications, workflows |
| **Twilio** | WhatsApp, SMS, Voice (see omnichannel rules) |
| **Payment/ERP** | As required by product |

---

## Adapter Pattern

```python
from abc import ABC, abstractmethod

class CRMAdapter(ABC):
    @abstractmethod
    async def sync_customer(self, customer: Customer) -> SyncResult:
        pass

    @abstractmethod
    async def create_activity(self, customer_id: str, activity: Activity) -> str:
        pass

    @abstractmethod
    async def get_customer_context(self, external_id: str) -> CustomerContext:
        pass

class SalesforceAdapter(CRMAdapter):
    def __init__(self, config: SalesforceConfig):
        self.client = SalesforceClient(config)

    async def sync_customer(self, customer: Customer):
        return await self.client.upsert_contact(customer.to_salesforce())

    async def create_activity(self, customer_id: str, activity: Activity):
        return await self.client.create_task(customer_id, activity.to_salesforce())

class HubSpotAdapter(CRMAdapter):
    # HubSpot-specific implementation
    pass
```

---

## Integration Config Schema

```sql
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    provider VARCHAR(50) NOT NULL,  -- salesforce, hubspot, zendesk, jira, slack
    config JSONB NOT NULL,  -- encrypted or reference to secrets
    enabled BOOLEAN DEFAULT true,
    webhook_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(organization_id, provider)
);
```

---

## Webhook Support (Outbound)

```python
# Events we can emit
WEBHOOK_EVENTS = [
    "ticket.created",
    "ticket.updated",
    "ticket.closed",
    "conversation.created",
    "conversation.closed",
    "message.received",
    "agent.assigned",
]

class WebhookService:
    async def emit(self, org_id: UUID, event: str, payload: dict):
        subscribers = await self.get_subscribers(org_id, event)

        for sub in subscribers:
            await self.queue.enqueue(
                "send_webhook",
                {
                    "url": sub.url,
                    "event": event,
                    "payload": payload,
                    "signature": self.sign(sub.secret, payload),
                }
            )

    async def send_webhook(self, job: WebhookJob):
        response = await self.http.post(
            job.url,
            json={"event": job.event, "data": job.payload},
            headers={"X-Signature": job.signature}
        )

        if response.status >= 500:
            raise RetryableError()  # Will retry with backoff
```

---

## SDK Support

```python
# Public SDK for developers
# sdk/python/customercare/client.py

class CustomerCareClient:
    def __init__(self, api_key: str, base_url: str = "https://api.customercare.com"):
        self.api_key = api_key
        self.base_url = base_url

    async def create_ticket(self, ticket: TicketCreate) -> Ticket:
        return await self._post("/api/v1/tickets", ticket.dict())

    async def send_message(self, conversation_id: str, message: str) -> Message:
        return await self._post(
            f"/api/v1/conversations/{conversation_id}/messages",
            {"content": message}
        )

    async def search_kb(self, query: str) -> list[KBResult]:
        return await self._get("/api/v1/knowledge/search", {"q": query})
```

---

## Audit Logging

```python
async def log_integration_action(
    org_id: UUID,
    provider: str,
    action: str,  # sync, push, pull, webhook_received
    resource_type: str,
    resource_id: str,
    status: str,  # success, failed, retrying
    details: dict | None = None
):
    await audit_repo.create(AuditLog(
        organization_id=org_id,
        actor_id=None,  # System action
        action=f"integration.{provider}.{action}",
        resource_type=resource_type,
        resource_id=resource_id,
        details={
            "status": status,
            "provider": provider,
            **(details or {})
        }
    ))
```

---

## Rules

1. **Adapter interface** — each integration behind a common interface
2. **Credentials in secrets** — use environment or secret manager, never hardcode
3. **Idempotency keys** — handle webhook retries gracefully
4. **Rate limit handling** — implement backoff for external API limits
5. **Audit all actions** — log sync, push, pull for compliance
6. **Versioned API contracts** — don't change webhook/public API without versioning

---

## Do Not

- Tightly couple core logic to a single CRM — support multiple via configuration
- Expose internal IDs in webhook payloads without necessity
- Change webhook or API contract without versioning and notice
- Store API keys or secrets in code or database without encryption
