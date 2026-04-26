# Omni-Channel Communication Rules

## Channel Stack

| Channel | Provider | Use Case |
|---------|----------|----------|
| Live Chat | WebSocket | Website chat, real-time streaming |
| WhatsApp | Twilio | Customer messaging |
| SMS | Twilio | Notifications, 2-way messaging |
| Email | SendGrid / AWS SES | Ticket ingestion, outbound |
| Slack | Slack API | Agent workflows, notifications |
| Teams | Microsoft Graph | Agent workflows, notifications |
| Voice | Twilio / OpenAI | Phone support |
| Video | WebRTC / Daily.co | Video support |
| Mobile | Push (FCM/APNs) | Native app notifications |

---

## Unified Conversation Model

```sql
-- One conversation spans multiple channels
conversations (
    id UUID,
    organization_id UUID,
    customer_id UUID,
    channel VARCHAR(20),  -- initial channel
    status VARCHAR(20),
    assigned_agent_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)

-- Each message tracks its channel
messages (
    id UUID,
    conversation_id UUID,
    organization_id UUID,
    sender_type VARCHAR(20),  -- customer, agent, system, ai
    channel VARCHAR(20),      -- can differ from conversation.channel
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
```

---

## Channel Adapter Pattern

```python
from abc import ABC, abstractmethod

class ChannelProvider(ABC):
    @abstractmethod
    async def send_message(self, conversation_id: UUID, content: str) -> MessageResult:
        pass

    @abstractmethod
    async def receive_webhook(self, payload: dict) -> IncomingMessage:
        pass

class TwilioWhatsAppProvider(ChannelProvider):
    async def send_message(self, conversation_id: UUID, content: str):
        # Twilio-specific implementation
        pass

    async def receive_webhook(self, payload: dict):
        # Validate Twilio signature, parse body
        pass

class SlackProvider(ChannelProvider):
    # Slack-specific implementation
    pass
```

---

## Webhook Handlers

```python
@router.post("/webhooks/twilio")
async def twilio_webhook(request: Request):
    # Validate Twilio signature
    signature = request.headers.get("X-Twilio-Signature")
    if not validate_twilio_signature(signature, await request.body()):
        raise HTTPException(403, "Invalid signature")

    # Parse and route to ingestion pipeline
    message = parse_twilio_message(await request.form())
    await conversation_service.ingest_message(message)

    return Response(status_code=200)

@router.post("/webhooks/email")
async def email_webhook(request: Request):
    # Validate provider signature
    # Parse email and create/update ticket
    pass

@router.post("/webhooks/slack")
async def slack_webhook(request: Request):
    # Validate Slack signing secret
    # Handle events or slash commands
    pass
```

---

## Rules

1. **Unified thread** — one conversation may have messages from multiple channels; store channel per message
2. **Channel switching** — allow customers to switch channels without losing context
3. **Isolate adapters** — channel-specific logic (Twilio XML, Slack blocks) stays in adapter layer
4. **Validate webhooks** — always validate signatures/tokens before processing
5. **Idempotency** — handle webhook retries without duplicate message processing
6. **Rate limiting** — protect webhook endpoints from abuse
7. **No hardcoded credentials** — use environment variables

---

## Do Not

- Put channel-specific logic in core conversation or ticket services
- Assume single channel per conversation — design for multi-channel
- Skip webhook signature validation
