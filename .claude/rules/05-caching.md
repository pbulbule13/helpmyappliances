# Caching Rules — Redis

## Use Cases

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| Session tokens | `session:{token_hash}` | 24h |
| Rate limiting | `ratelimit:{org_id}:{endpoint}` | 1m |
| Agent run status | `agent_run:{run_id}` | 1h |
| Conversation cache | `conv:{org_id}:{conv_id}` | 15m |
| Embedding cache | `embed:{hash}` | 24h |
| WebSocket presence | `presence:{org_id}:{user_id}` | 5m |

## Key Naming Convention

```
{namespace}:{tenant}:{resource}:{id}
```

Examples:
- `session:abc123` — session token
- `conv:org_123:conv_456` — conversation cache
- `ratelimit:org_123:chat_query` — rate limit counter

## Rules

1. **Always set TTL** — no keys without expiration
2. **Include org_id in keys** for tenant isolation where applicable
3. **Use Redis for ephemeral data only** — source of truth is PostgreSQL
4. **Invalidate on write** — update cache when data changes
5. **Graceful degradation** — if Redis fails, fall back to DB

## Patterns

### Cache-Aside

```python
async def get_conversation(org_id: str, conv_id: str) -> Conversation:
    cache_key = f"conv:{org_id}:{conv_id}"

    # Try cache first
    cached = await redis.get(cache_key)
    if cached:
        return Conversation.parse_raw(cached)

    # Fall back to DB
    conv = await repo.get_by_id(org_id, conv_id)
    if conv:
        await redis.setex(cache_key, 900, conv.json())  # 15m TTL

    return conv
```

### Rate Limiting

```python
async def check_rate_limit(org_id: str, endpoint: str, limit: int = 100) -> bool:
    key = f"ratelimit:{org_id}:{endpoint}"
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, 60)  # 1 minute window
    return current <= limit
```

### Pub/Sub for Real-time

```python
# Publish conversation updates
await redis.publish(f"conv_updates:{org_id}", message.json())

# Subscribe in WebSocket handler
async for message in pubsub.listen():
    await websocket.send(message["data"])
```

## Background Job Queue

Use Redis-backed queue (ARQ/Celery) for:
- Document processing
- Embedding generation
- Agent execution
- Email/notification sending
- Call transcription
