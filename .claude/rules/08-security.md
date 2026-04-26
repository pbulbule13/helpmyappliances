# Security Rules

## Authentication

### JWT Strategy

```python
# Token structure
{
    "sub": "user_id",
    "org": "organization_id",
    "role": "team_member",
    "exp": 1234567890,
    "iat": 1234567890
}

# Short-lived access tokens (15m) + refresh tokens (7d)
ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=7)
```

### Auth Middleware

```python
async def require_auth(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session)
) -> AuthContext:
    payload = verify_jwt(token)
    user = await get_user(session, payload["sub"])
    if not user:
        raise HTTPException(401, "Invalid token")
    return AuthContext(user=user, org_id=payload["org"], role=payload["role"])
```

## Authorization

### Role Checks (as per PRD.md)

```python
# Roles: admin, team_owner, team_member, end_user
def require_role(*allowed_roles: str):
    async def check(auth: AuthContext = Depends(require_auth)):
        if auth.role not in allowed_roles:
            raise HTTPException(403, "Insufficient permissions")
        return auth
    return check

# Usage
@router.delete("/members/{user_id}")
async def remove_member(
    user_id: UUID,
    auth: AuthContext = Depends(require_role("admin", "team_owner"))
):
    ...
```

### Role Access Matrix

| Role | Auth | Org Mgmt | KB | Chat | Agents | Billing | Admin |
|------|------|----------|-----|------|--------|---------|-------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| team_owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| team_member | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| end_user | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |

```python
# Example: KB access requires team_member or above
@router.post("/kb/upload")
async def upload_document(
    auth: AuthContext = Depends(require_role("admin", "team_owner", "team_member"))
):
    ...
```

### Tenant Validation

```python
# ALWAYS validate org membership
async def validate_org_access(auth: AuthContext, org_id: UUID):
    membership = await get_membership(auth.user.id, org_id)
    if not membership:
        raise HTTPException(403, "Not a member of this organization")
    return membership
```

## Rules

1. **Never trust client-side role** — always read from `memberships` table
2. **Validate org membership** on every org-scoped request
3. **No secrets in code** — use environment variables
4. **HTTPS only** in production
5. **Rate limit all endpoints** — especially auth and AI endpoints
6. **Sanitize all inputs** — prevent XSS, SQL injection
7. **Audit sensitive actions** — log to `usage_events`

## API Security

```python
# Rate limiting
@router.post("/chat/query")
@rate_limit(requests=100, window=60)  # 100 req/min per org
async def chat_query(...):
    ...

# Input validation (Pydantic does this)
class ChatQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: UUID
```

## Data Protection

```python
# Hash passwords with bcrypt
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# Encrypt sensitive fields at rest (PII, API keys)
encrypted_api_key = encrypt(api_key, settings.ENCRYPTION_KEY)

# Never log sensitive data
logger.info("User logged in", extra={"user_id": user.id})  # OK
logger.info(f"User {email} with password {password}")  # NEVER
```

## CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # explicit list, not "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## AI Safety & Security ⭐

<!-- [CHANGE] Remove this section if not using AI/LLM features -->

### Critical AI Security Rules

**If your application uses AI/LLMs, these rules are MANDATORY**

---

### 1. Prompt Injection Defense

**Threat:** Users inject malicious instructions into prompts to manipulate AI behavior

**Defense Strategies:**

```python
# 1. Separate user input from system instructions
def build_prompt(user_input: str, context: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": SYSTEM_PROMPT  # Your instructions - user cannot modify
        },
        {
            "role": "user",
            "content": f"User query: {user_input}\n\nContext: {context}"
        }
    ]

# 2. Input validation and sanitization
def sanitize_user_input(user_input: str) -> str:
    """
    Remove or escape potential injection attempts.
    """
    # Remove system-like instructions
    dangerous_patterns = [
        r"ignore (previous|above) instructions",
        r"you are now",
        r"<\|im_start\|>",  # Chat template markers
        r"### (system|assistant):",  # Role markers
    ]

    for pattern in dangerous_patterns:
        user_input = re.sub(pattern, "", user_input, flags=re.IGNORECASE)

    # Length limits
    if len(user_input) > 10000:
        raise ValidationError("Input too long")

    return user_input

# 3. Output validation
def validate_ai_response(response: str, context: dict) -> str:
    """
    Verify AI didn't leak system info or produce harmful content.
    """
    # Check for system prompt leakage
    if any(secret in response for secret in context.get("secrets", [])):
        logger.error("AI response contained secrets!")
        return "I cannot provide that information."

    # Check for harmful content (use content moderation API)
    if is_harmful_content(response):
        return "I cannot generate that type of content."

    return response
```

**Anti-Patterns:**
- ❌ Never trust user input as safe instructions
- ❌ Don't embed API keys or secrets in system prompts
- ❌ Don't allow direct prompt template modification by users

---

### 2. Tool Input/Output Validation ⭐

**Critical:** AI agents with tool access must validate ALL tool calls

```python
class ToolValidator:
    """Validate and authorize tool calls before execution."""

    def validate_tool_call(
        self,
        tool_name: str,
        tool_input: dict,
        context: SecurityContext
    ) -> bool:
        # 1. Check tool is allowed for this user/org
        if not self.is_tool_authorized(tool_name, context):
            raise PermissionDeniedError(f"Tool {tool_name} not authorized")

        # 2. Validate input schema
        schema = TOOL_SCHEMAS[tool_name]
        validate(tool_input, schema)  # Raises if invalid

        # 3. Enforce access controls
        if "organization_id" in tool_input:
            if tool_input["organization_id"] != context.org_id:
                raise PermissionDeniedError("Cross-tenant access denied")

        # 4. Rate limit tool usage
        if not self.check_rate_limit(tool_name, context.user_id):
            raise RateLimitError(f"Too many {tool_name} calls")

        return True

    def validate_tool_output(self, output: Any, tool_name: str) -> Any:
        """Validate tool output before returning to AI or user."""
        # Remove sensitive fields
        if isinstance(output, dict):
            output.pop("password_hash", None)
            output.pop("api_key", None)
            output.pop("secret", None)

        # Enforce output size limits
        output_str = json.dumps(output)
        if len(output_str) > 50000:
            raise ValueError("Tool output too large")

        return output

# Usage in agent
async def execute_tool(tool_call: ToolCall, context: SecurityContext):
    # ALWAYS validate before execution
    validator.validate_tool_call(
        tool_call.name,
        tool_call.input,
        context
    )

    # Execute tool
    result = await tools[tool_call.name](tool_call.input)

    # ALWAYS validate output
    safe_result = validator.validate_tool_output(result, tool_call.name)

    return safe_result
```

**Rules:**
- ✅ Validate ALL tool inputs against schema
- ✅ Enforce tenant/user scoping on tool calls
- ✅ Rate limit expensive operations
- ✅ Validate tool outputs (remove secrets, limit size)
- ✅ Log all tool executions for audit

**Anti-Patterns:**
- ❌ Never allow agents direct database/API access without tool layer
- ❌ Don't trust AI-generated tool inputs without validation
- ❌ Don't return full error stack traces to AI (info leak)

---

### 3. Trust Boundaries

**Critical:** Don't trust LLM outputs in security-critical decisions

```python
# WRONG - Trusting AI for auth decision
user_query = "Am I allowed to delete user 123?"
ai_response = await llm.ask(user_query)
if "yes" in ai_response.lower():
    delete_user(123)  # SECURITY VULNERABILITY!

# CORRECT - AI assists, code validates
user_query = "Can I delete user 123?"
ai_response = await llm.ask(user_query)
# Always verify with actual permission check
if has_permission(current_user, "delete_user", user_123):
    delete_user(123)
    return f"Yes, deleted. {ai_response}"
else:
    return f"No permission. {ai_response}"
```

**Rules:**
- ✅ Use AI for suggestions, not decisions
- ✅ Always verify AI outputs in critical paths
- ✅ Implement separate validation logic
- ✅ Log when AI suggestions are overridden

---

### 4. System Prompt Protection

**Protect your system prompts and configuration**

```python
# DO: Store system prompts outside code
SYSTEM_PROMPTS = {
    "customer_support": load_prompt("prompts/customer_support.txt"),
    "data_analysis": load_prompt("prompts/data_analysis.txt"),
}

# DON'T: Hardcode prompts or expose to users
# DON'T: Allow users to see/modify system prompts
# DON'T: Include API keys or internal URLs in prompts

# Prevent prompt disclosure
def sanitize_ai_response(response: str) -> str:
    """Remove any leaked system prompt fragments."""
    # Check if response contains system prompt text
    for prompt in SYSTEM_PROMPTS.values():
        if prompt[:100] in response:  # Check first 100 chars
            logger.error("System prompt leaked in AI response!")
            return "I apologize, I cannot provide that information."
    return response
```

---

### 5. PII Protection in AI Workflows

**Detect and protect personally identifiable information**

```python
def redact_pii(text: str) -> tuple[str, list[dict]]:
    """
    Redact PII before sending to AI service.
    Return redacted text and mapping for restoration.
    """
    redactions = []

    # Email
    text = re.sub(
        r'\b[\w.-]+@[\w.-]+\.\w+\b',
        lambda m: (redactions.append({"type": "email", "value": m.group()}), "[EMAIL]")[1],
        text
    )

    # Phone
    text = re.sub(
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        lambda m: (redactions.append({"type": "phone", "value": m.group()}), "[PHONE]")[1],
        text
    )

    # SSN, credit cards, etc.
    # ... additional patterns ...

    return text, redactions

# Usage
async def process_with_ai(user_message: str) -> str:
    # Redact before sending to AI
    redacted_message, redactions = redact_pii(user_message)

    # Send to AI
    ai_response = await llm.generate(redacted_message)

    # Log without PII
    logger.info("AI call", extra={"message": redacted_message})

    return ai_response
```

---

### 6. Content Filtering

**Filter harmful model outputs before delivery**

```python
async def filter_harmful_content(response: str) -> str:
    """
    Check AI response for harmful content.
    Use OpenAI Moderation API or similar.
    """
    moderation = await openai.moderations.create(input=response)

    if moderation.results[0].flagged:
        categories = moderation.results[0].categories
        logger.warning("Harmful content detected", extra={"categories": categories})
        return "I cannot generate that type of content. Please rephrase your question."

    return response

# Usage
ai_response = await generate_response(query)
safe_response = await filter_harmful_content(ai_response)
return safe_response
```

---

### 7. AI-Specific Rate Limiting

**Prevent abuse and cost overruns**

```python
# Per-user AI usage limits
AI_RATE_LIMITS = {
    "free": {"requests_per_hour": 10, "tokens_per_day": 10000},
    "pro": {"requests_per_hour": 100, "tokens_per_day": 1000000},
    "enterprise": {"requests_per_hour": 1000, "tokens_per_day": 10000000},
}

async def check_ai_rate_limit(user_id: str, tier: str) -> bool:
    limits = AI_RATE_LIMITS[tier]

    # Check request rate
    request_count = await redis.incr(f"ai_requests:{user_id}:hour")
    if request_count == 1:
        await redis.expire(f"ai_requests:{user_id}:hour", 3600)
    if request_count > limits["requests_per_hour"]:
        raise RateLimitError("Too many AI requests")

    # Check token usage
    tokens_today = await redis.get(f"ai_tokens:{user_id}:day")
    if int(tokens_today or 0) > limits["tokens_per_day"]:
        raise RateLimitError("Daily token limit exceeded")

    return True
```

---

## Security Headers

```python
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```
