# Prompt Logging Rules

## Purpose

Track all AI interactions for:
- Debugging and improvement
- Compliance and audit
- Cost tracking
- Quality monitoring

## Schema

```sql
CREATE TABLE prompt_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    conversation_id UUID REFERENCES conversations(id),
    agent_run_id UUID REFERENCES agent_runs(id),

    -- Request
    model VARCHAR(50) NOT NULL,
    system_prompt TEXT,
    messages JSONB NOT NULL,  -- [{role, content}]
    tools JSONB,  -- function definitions if used

    -- Response
    response_content TEXT,
    tool_calls JSONB,  -- function calls made
    finish_reason VARCHAR(20),

    -- Metrics
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms INTEGER,

    -- Metadata
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prompt_logs_org_created ON prompt_logs(organization_id, created_at);
CREATE INDEX idx_prompt_logs_conversation ON prompt_logs(conversation_id);
```

## Logging Implementation

```python
import time
from contextlib import asynccontextmanager

@asynccontextmanager
async def log_prompt(
    org_id: UUID,
    conversation_id: UUID | None = None,
    agent_run_id: UUID | None = None
):
    start = time.time()
    log_entry = PromptLog(
        organization_id=org_id,
        conversation_id=conversation_id,
        agent_run_id=agent_run_id
    )

    try:
        yield log_entry
    finally:
        log_entry.latency_ms = int((time.time() - start) * 1000)
        await prompt_log_repo.create(log_entry)

# Usage
async with log_prompt(org_id, conv_id) as log:
    log.model = "gpt-4o"
    log.system_prompt = system_prompt
    log.messages = messages

    response = await client.chat.completions.create(...)

    log.response_content = response.choices[0].message.content
    log.prompt_tokens = response.usage.prompt_tokens
    log.completion_tokens = response.usage.completion_tokens
    log.total_tokens = response.usage.total_tokens
    log.finish_reason = response.choices[0].finish_reason
```

## Rules

1. **Log every AI call** — no exceptions
2. **Tenant scoped** — always include `organization_id`
3. **No PII in logs** — redact sensitive customer data
4. **Async logging** — don't block response on log write
5. **Retention policy** — 90 days default, configurable per org

## PII Redaction

```python
import re

def redact_pii(text: str) -> str:
    # Email
    text = re.sub(r'\b[\w.-]+@[\w.-]+\.\w+\b', '[EMAIL]', text)
    # Phone
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    # SSN
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
    # Credit card
    text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]', text)
    return text

# Apply before logging
log.messages = [
    {"role": m["role"], "content": redact_pii(m["content"])}
    for m in messages
]
```

## Usage Analytics

```python
# Daily token usage per org
async def get_daily_usage(org_id: UUID, date: date) -> dict:
    result = await db.execute("""
        SELECT
            model,
            COUNT(*) as request_count,
            SUM(prompt_tokens) as total_prompt_tokens,
            SUM(completion_tokens) as total_completion_tokens,
            AVG(latency_ms) as avg_latency_ms
        FROM prompt_logs
        WHERE organization_id = :org_id
          AND DATE(created_at) = :date
        GROUP BY model
    """, {"org_id": org_id, "date": date})
    return result.mappings().all()
```

## Billing Integration

```python
# Log to usage_events for billing
async def record_token_usage(log: PromptLog):
    await usage_events_repo.create(
        organization_id=log.organization_id,
        event_type="ai_tokens",
        quantity=log.total_tokens,
        metadata={
            "model": log.model,
            "prompt_log_id": str(log.id)
        }
    )
```

## Quality Monitoring

Track these metrics from prompt logs:
- Average response latency by model
- Token usage trends
- Finish reason distribution (stop vs length vs tool_calls)
- Error rates by model/org
- Cost per conversation
