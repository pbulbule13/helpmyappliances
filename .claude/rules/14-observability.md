# Observability Rules

## Three Pillars

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    Logs     │  │   Metrics   │  │   Traces    │
│ (CloudWatch)│  │(Prometheus) │  │  (Jaeger)   │
└─────────────┘  └─────────────┘  └─────────────┘
        │               │               │
        └───────────────┴───────────────┘
                        │
              ┌─────────────────┐
              │   Dashboards    │
              │   (Grafana)     │
              └─────────────────┘
```

## Structured Logging

```python
import structlog

logger = structlog.get_logger()

# Always include context
logger.info(
    "conversation_created",
    organization_id=str(org_id),
    conversation_id=str(conv_id),
    channel="chat",
    customer_id=str(customer_id)
)

# Error logging with stack trace
logger.exception(
    "agent_execution_failed",
    organization_id=str(org_id),
    agent_run_id=str(run_id),
    error_type=type(e).__name__
)
```

## Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "event": "conversation_created",
  "organization_id": "org_123",
  "conversation_id": "conv_456",
  "channel": "chat",
  "service": "backend",
  "environment": "prod"
}
```

## Rules

1. **Structured JSON logs** — never plain text in production
2. **Include tenant context** — `organization_id` in every log
3. **Log levels**:
   - DEBUG: Development only
   - INFO: Normal operations
   - WARNING: Recoverable issues
   - ERROR: Failures requiring attention
4. **No PII in logs** — never log emails, names, messages content
5. **Request IDs** — trace requests across services

## Metrics

```python
from prometheus_client import Counter, Histogram

# Counters
messages_total = Counter(
    'messages_total',
    'Total messages processed',
    ['organization_id', 'channel']
)

# Histograms
response_latency = Histogram(
    'ai_response_latency_seconds',
    'AI response generation latency',
    ['model']
)

# Usage
messages_total.labels(organization_id=org_id, channel="chat").inc()

with response_latency.labels(model="gpt-4o").time():
    response = await generate_response(query)
```

## Key Metrics

### Infrastructure Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, path | HTTP request latency |
| `database_query_duration_seconds` | Histogram | query_type | Database query time |
| `cache_hits_total` | Counter | cache_type | Cache hit count |
| `cache_misses_total` | Counter | cache_type | Cache miss count |
| `queue_depth` | Gauge | queue_name | Background job queue size |

### AI-Specific Metrics ⭐

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `ai_tokens_used_total` | Counter | org_id, model, operation | Total AI tokens consumed |
| `ai_response_latency_seconds` | Histogram | model, operation | AI API latency |
| `ai_errors_total` | Counter | model, error_type | AI API errors |
| `ai_rate_limit_hits_total` | Counter | org_id, model | Rate limit violations |
| `rag_retrieval_latency_seconds` | Histogram | org_id | RAG retrieval time |
| `rag_chunks_retrieved` | Histogram | org_id | Number of chunks per query |
| `agent_runs_total` | Counter | org_id, agent_name, status | Agent execution count |
| `agent_tool_calls_total` | Counter | org_id, tool_name | Agent tool usage |
| `vector_search_latency_seconds` | Histogram | org_id | Vector search time |

### Conversation Analytics ⭐

<!-- [CHANGE] Add these if building conversational/support application -->

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `conversations_total` | Counter | org_id, channel, source | Total conversations |
| `conversations_active` | Gauge | org_id, channel | Currently active conversations |
| `conversation_duration_seconds` | Histogram | org_id, channel | Conversation length |
| `messages_per_conversation` | Histogram | org_id, channel | Messages per conversation |
| `customer_satisfaction_score` | Histogram | org_id, channel | CSAT ratings (1-5) |
| `sentiment_score` | Histogram | org_id | Sentiment analysis (-1 to 1) |
| `resolution_time_seconds` | Histogram | org_id, priority | Time to resolution |
| `ai_vs_human_resolution` | Counter | org_id, resolver_type | AI vs human resolutions |
| `escalations_total` | Counter | org_id, reason | Escalation to human count |
| `first_response_time_seconds` | Histogram | org_id, channel | Time to first response |
| `tickets_created_total` | Counter | org_id, category, priority | Tickets created |
| `tickets_resolved_total` | Counter | org_id, category | Tickets resolved |
| `sla_breaches_total` | Counter | org_id, sla_type | SLA violations |

---

## AI & Conversation Monitoring ⭐

### Critical Paths to Instrument

**AI Operations:**
```python
# Track AI API calls with full context
@observe_ai_call
async def generate_response(prompt: str, context: dict):
    start_time = time.time()

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=build_messages(prompt, context)
        )

        # Metrics
        ai_response_latency.labels(model="gpt-4o", operation="chat").observe(
            time.time() - start_time
        )
        ai_tokens_used.labels(
            org_id=context["org_id"],
            model="gpt-4o",
            operation="chat"
        ).inc(response.usage.total_tokens)

        # Structured logging
        logger.info(
            "ai_completion_success",
            organization_id=context["org_id"],
            model="gpt-4o",
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            latency_ms=int((time.time() - start_time) * 1000)
        )

        return response

    except Exception as e:
        ai_errors_total.labels(
            model="gpt-4o",
            error_type=type(e).__name__
        ).inc()

        logger.error(
            "ai_completion_failed",
            organization_id=context["org_id"],
            model="gpt-4o",
            error=str(e),
            latency_ms=int((time.time() - start_time) * 1000)
        )
        raise
```

**RAG Retrieval:**
```python
async def search_knowledge_base(query: str, org_id: str):
    start_time = time.time()

    try:
        results = await vector_store.search(query, org_id)

        # Metrics
        rag_retrieval_latency.labels(org_id=org_id).observe(
            time.time() - start_time
        )
        rag_chunks_retrieved.labels(org_id=org_id).observe(len(results))

        logger.info(
            "rag_retrieval_success",
            organization_id=org_id,
            query_length=len(query),
            results_count=len(results),
            latency_ms=int((time.time() - start_time) * 1000)
        )

        return results
    except Exception as e:
        logger.error("rag_retrieval_failed", organization_id=org_id, error=str(e))
        raise
```

**Conversation Lifecycle:**
```python
class ConversationMetrics:
    """Track conversation lifecycle metrics"""

    async def on_conversation_start(self, conv: Conversation):
        conversations_total.labels(
            org_id=conv.organization_id,
            channel=conv.channel,
            source=conv.source
        ).inc()

        conversations_active.labels(
            org_id=conv.organization_id,
            channel=conv.channel
        ).inc()

        logger.info(
            "conversation_started",
            organization_id=conv.organization_id,
            conversation_id=str(conv.id),
            channel=conv.channel
        )

    async def on_conversation_end(self, conv: Conversation):
        duration = (conv.ended_at - conv.created_at).total_seconds()

        conversations_active.labels(
            org_id=conv.organization_id,
            channel=conv.channel
        ).dec()

        conversation_duration_seconds.labels(
            org_id=conv.organization_id,
            channel=conv.channel
        ).observe(duration)

        messages_per_conversation.labels(
            org_id=conv.organization_id,
            channel=conv.channel
        ).observe(conv.message_count)

        logger.info(
            "conversation_ended",
            organization_id=conv.organization_id,
            conversation_id=str(conv.id),
            duration_seconds=duration,
            message_count=conv.message_count,
            resolution_type=conv.resolution_type
        )

    async def on_customer_satisfaction(self, conv: Conversation, rating: int):
        customer_satisfaction_score.labels(
            org_id=conv.organization_id,
            channel=conv.channel
        ).observe(rating)

        logger.info(
            "csat_recorded",
            organization_id=conv.organization_id,
            conversation_id=str(conv.id),
            rating=rating
        )

    async def on_sentiment_analysis(self, message: Message, sentiment: float):
        sentiment_score.labels(org_id=message.organization_id).observe(sentiment)

    async def on_escalation(self, conv: Conversation, reason: str):
        escalations_total.labels(
            org_id=conv.organization_id,
            reason=reason
        ).inc()

        logger.warning(
            "conversation_escalated",
            organization_id=conv.organization_id,
            conversation_id=str(conv.id),
            reason=reason
        )
```

---

## Real-Time Analytics Dashboard ⭐

### Essential KPIs (if using AI/Conversations)

```python
# Dashboard metrics endpoint
@router.get("/api/v1/admin/analytics/real-time")
async def get_real_time_analytics(org_id: UUID) -> dict:
    """Real-time analytics for AI/conversation systems"""

    return {
        # Conversation metrics
        "active_conversations": await get_active_count(org_id),
        "conversations_today": await get_daily_count(org_id),
        "avg_resolution_time_minutes": await get_avg_resolution_time(org_id),

        # AI performance
        "ai_response_latency_p95_ms": await get_ai_latency_p95(org_id),
        "ai_tokens_used_today": await get_daily_tokens(org_id),
        "ai_error_rate_percent": await get_ai_error_rate(org_id),

        # Quality metrics
        "avg_csat": await get_avg_csat(org_id),
        "avg_sentiment": await get_avg_sentiment(org_id),
        "ai_resolution_rate_percent": await get_ai_resolution_rate(org_id),

        # SLA metrics
        "sla_compliance_percent": await get_sla_compliance(org_id),
        "escalation_rate_percent": await get_escalation_rate(org_id),
    }
```

### Dashboard Panels

**AI Performance:**
- AI response latency (p50, p95, p99)
- Token usage by model
- AI error rate
- RAG retrieval latency
- Agent success rate

**Conversation Health:**
- Active conversations by channel
- Average resolution time
- First response time
- Messages per conversation
- Escalation rate

**Quality Metrics:**
- CSAT trends
- Sentiment distribution
- AI vs human resolution rate
- SLA compliance rate

**Cost Tracking:**
- Token usage by organization
- Estimated AI costs
- Cost per conversation
- Cost per resolution

## Distributed Tracing

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

async def handle_chat_query(request: ChatQueryRequest):
    with tracer.start_as_current_span("chat_query") as span:
        span.set_attribute("organization_id", str(request.org_id))
        span.set_attribute("conversation_id", str(request.conversation_id))

        with tracer.start_as_current_span("vector_search"):
            results = await search_knowledge_base(request.query)

        with tracer.start_as_current_span("generate_response"):
            response = await generate_response(request.query, results)

        return response
```

## Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: customercare
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical

      - alert: AILatencyHigh
        expr: histogram_quantile(0.95, ai_response_latency_seconds) > 5
        for: 10m
        labels:
          severity: warning
```

## Health Dashboard

Essential panels:
- Request rate by endpoint
- Error rate by status code
- AI response latency (p50, p95, p99)
- Active conversations by channel
- Token usage by organization
- Queue depth for background jobs
