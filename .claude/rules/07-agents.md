# Agent Orchestration Rules

<!-- [CHANGE] Update AI provider or remove if not using AI agents -->

## Agent Architecture ⭐

**Modular Design - Separate Concerns**

```
┌──────────────────────────────────────────────────────┐
│              Agent Orchestrator                       │
├──────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Planner │  │Executor │  │ Memory  │  │Evaluator│ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
├──────────────────────────────────────────────────────┤
│                   Tool Layer ⭐                        │
│              (REQUIRED - No Direct Access)            │
├──────────────────────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌──────┐ ┌────────┐ │
│  │Search │ │ API   │ │ RAG   │ │DB    │ │Custom  │ │
│  │ Tool  │ │ Tool  │ │ Tool  │ │Tool  │ │ Tool   │ │
│  └───────┘ └───────┘ └───────┘ └──────┘ └────────┘ │
└──────────────────────────────────────────────────────┘
            │           │           │
            ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Database │ │ External │ │  Vector  │
    │          │ │   APIs   │ │  Store   │
    └──────────┘ └──────────┘ └──────────┘
```

**CRITICAL:** Agents MUST NOT directly access databases, APIs, or external services. All access through Tool Layer.

---

## Tool Layer (Required) ⭐

### Why Tool Layer is Mandatory

**Security & Control:**
- Validate all inputs before execution
- Enforce authorization and tenant scoping
- Rate limit expensive operations
- Audit all tool calls
- Prevent direct resource access

### Tool Layer Implementation

```python
from abc import ABC, abstractmethod
from pydantic import BaseModel

class ToolInput(BaseModel):
    """Base class for tool inputs - enforces validation"""
    pass

class ToolOutput(BaseModel):
    """Base class for tool outputs - enforces structure"""
    success: bool
    data: dict | list | str | None
    error: str | None = None

class Tool(ABC):
    """
    Base tool interface.
    CRITICAL: All agent tools must inherit from this.
    """
    name: str
    description: str
    input_schema: type[ToolInput]
    output_schema: type[ToolOutput]

    @abstractmethod
    async def execute(
        self,
        input: ToolInput,
        context: SecurityContext
    ) -> ToolOutput:
        """
        Execute tool with validated input and security context.

        IMPORTANT:
        - Validate input against schema
        - Check permissions in context
        - Enforce tenant scoping
        - Log execution
        - Handle errors gracefully
        """
        pass

# Example: Search Knowledge Base Tool
class SearchKBInput(ToolInput):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)

class SearchKBOutput(ToolOutput):
    data: list[dict]  # List of search results

class SearchKnowledgeBaseTool(Tool):
    name = "search_knowledge_base"
    description = "Search the organization's knowledge base"
    input_schema = SearchKBInput
    output_schema = SearchKBOutput

    def __init__(self, rag_service: RAGService):
        self.rag_service = rag_service

    async def execute(
        self,
        input: SearchKBInput,
        context: SecurityContext
    ) -> SearchKBOutput:
        try:
            # 1. Validate permissions
            if not context.has_permission("search_kb"):
                return SearchKBOutput(
                    success=False,
                    data=None,
                    error="Permission denied"
                )

            # 2. Execute with tenant scoping (CRITICAL)
            results = await self.rag_service.search(
                query=input.query,
                organization_id=context.org_id,  # Always scope
                top_k=input.top_k
            )

            # 3. Log tool usage
            await log_tool_usage(
                org_id=context.org_id,
                tool_name=self.name,
                input=input.dict(),
                success=True
            )

            # 4. Return structured output
            return SearchKBOutput(
                success=True,
                data=results,
                error=None
            )

        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            return SearchKBOutput(
                success=False,
                data=None,
                error=str(e)
            )

# Tool Registry
class ToolRegistry:
    """Centralized tool management"""

    def __init__(self):
        self.tools: dict[str, Tool] = {}

    def register(self, tool: Tool):
        """Register a tool"""
        self.tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        """Get tool by name"""
        return self.tools.get(name)

    def list_tools(self) -> list[dict]:
        """List all available tools (for AI function calling)"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.input_schema.schema()
                }
            }
            for tool in self.tools.values()
        ]
```

### Anti-Patterns (NEVER Do This)

```python
# ❌ WRONG - Direct database access
class BadAgent:
    async def execute(self):
        # SECURITY VULNERABILITY!
        results = await db.query(User).all()  # No validation, no scoping
        return results

# ❌ WRONG - Direct API access
class BadAgent:
    async def execute(self):
        # No validation, no error handling
        response = requests.get("https://api.example.com/data")
        return response.json()

# ✅ CORRECT - Through tool layer
class GoodAgent:
    def __init__(self, tools: ToolRegistry):
        self.tools = tools

    async def execute(self, context: SecurityContext):
        # Tools handle validation, scoping, errors
        search_tool = self.tools.get("search_kb")
        result = await search_tool.execute(
            SearchKBInput(query="user question"),
            context
        )
        return result
```

## OpenAI Function Calling

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the organization's knowledge base",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    }
]

response = await client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)
```

## Multi-Agent Coordination

### Supervisor Pattern (Recommended)

**For multi-agent systems, use supervisor/policy logic**

```python
class SupervisorAgent:
    """
    Coordinates multiple specialized agents.
    Decides which agent to route tasks to.
    """
    def __init__(self, agents: dict[str, Agent]):
        self.agents = agents

    async def route_task(self, task: Task, context: dict) -> Agent:
        """Determine which agent should handle this task"""
        # Use LLM or rules to decide routing
        routing_decision = await self.decide_routing(task, context)

        agent_name = routing_decision["agent"]
        if agent_name not in self.agents:
            raise ValueError(f"Unknown agent: {agent_name}")

        return self.agents[agent_name]

    async def execute(self, task: Task, context: dict) -> Result:
        """Execute task with appropriate agent"""
        agent = await self.route_task(task, context)

        result = await agent.execute(task, context)

        # Supervisor can review/modify result
        if result.confidence < 0.8:
            result = await self.human_review(result)

        return result
```

**Anti-Pattern:** Peer-to-peer agent communication (hard to debug, unpredictable)

---

## Deterministic Workflows

**Keep critical business workflows deterministic**

```python
# ✅ CORRECT - Deterministic routing
async def route_ticket(ticket: Ticket) -> Agent:
    """Use clear rules for critical workflows"""
    if ticket.priority == "urgent":
        return agents["escalation_agent"]
    elif ticket.category in ["billing", "refund"]:
        return agents["billing_agent"]
    elif ticket.requires_technical:
        return agents["technical_agent"]
    else:
        return agents["general_agent"]

# ⚠️ CAUTION - AI-based routing (use for non-critical only)
async def ai_route_ticket(ticket: Ticket) -> Agent:
    """AI decides routing - less predictable"""
    decision = await llm.decide_routing(ticket)
    return agents[decision.agent_name]  # Might be wrong!

# BEST PRACTICE: Hybrid approach
async def hybrid_route(ticket: Ticket) -> Agent:
    # Use rules for critical cases
    if ticket.priority == "urgent" or ticket.value > 10000:
        return rule_based_route(ticket)
    # Use AI for standard cases
    else:
        return await ai_route_ticket(ticket)
```

---

## State Management

**Distinguish conversation state from long-term memory**

```python
class AgentMemory:
    """Manage agent state across turns"""

    def __init__(self):
        self.conversation_state: dict = {}  # Short-term (current conversation)
        self.long_term_memory: dict = {}     # Persistent (user preferences, facts)

    async def save_conversation_state(
        self,
        conversation_id: str,
        state: dict
    ):
        """Save short-term conversation context"""
        await redis.setex(
            f"conv_state:{conversation_id}",
            1800,  # 30 minutes
            json.dumps(state)
        )

    async def save_long_term_memory(
        self,
        user_id: str,
        key: str,
        value: Any
    ):
        """Save persistent user information"""
        await db.execute(
            "INSERT INTO user_memory (user_id, key, value) VALUES (?, ?, ?)",
            (user_id, key, json.dumps(value))
        )
```

---

## Critical Rules

### 1. Tool Layer Requirement ⭐

**Agents MUST NOT directly access databases or external APIs except through tool layer**
   ```python
   agent_run = AgentRun(
       organization_id=org_id,
       conversation_id=conv_id,
       agent_config_id=config.id,
       status="running",
       input={"query": user_message}
   )
   await repo.create(agent_run)
   ```

### 2. Structured Output Schemas (Production) ⭐

**Use structured schemas for agent outputs in production** - prevents parsing errors and enables validation

### 3. Templated Prompts (Required) ⭐

**Prompts must be templated and stored separately from orchestration logic** - enables versioning and A/B testing

### 4. Output Validation & Fallback

**Incorporate output validation and fallback behavior** for production reliability

### 5. Log All Agent Runs

**Log all agent runs** to `agent_runs` table with full audit trail

### 6. Execute Async for Long Tasks

**Don't block HTTP** — use background jobs for agent execution
   ```python
   @router.post("/agents/run")
   async def run_agent(request: AgentRunRequest):
       run_id = await queue_agent_run(request)
       return {"run_id": run_id, "status": "queued"}
   ```

### 7. Timeout Protection

**Max execution time per run** — prevent runaway agents
   ```python
   async with asyncio.timeout(300):  # 5 minute max
       result = await execute_agent(run)
   ```

### 8. Tenant Scoping

**Tool sandboxing** — agents can only access their tenant's data (enforce in tool layer)
   ```python
   class TenantScopedTools:
       def __init__(self, org_id: UUID):
           self.org_id = org_id

       async def search_kb(self, query: str):
           # Always scoped to org_id
           return await rag_service.search(self.org_id, query)
   ```

### 9. Track Token Usage

**Track token usage** for billing and cost monitoring
   ```python
   await log_usage_event(
       org_id=org_id,
       event_type="agent_tokens",
       quantity=response.usage.total_tokens,
       metadata={"model": "gpt-4o", "run_id": str(run.id)}
   )
   ```

## Structured Output Schemas ⭐

**CRITICAL:** Use structured schemas for agent outputs in production

### Why Structured Outputs

**Problems with free-form text:**
- Unpredictable format
- Hard to validate
- Difficult to test
- Error-prone parsing

**Solution:** Define output schemas

```python
from pydantic import BaseModel, Field

# Define expected output structure
class TicketAnalysis(BaseModel):
    """Structured output for ticket analysis"""
    category: str = Field(..., description="Ticket category")
    priority: str = Field(..., description="Priority level: low, medium, high, urgent")
    sentiment: str = Field(..., description="Customer sentiment: positive, neutral, negative")
    confidence: float = Field(..., ge=0.0, le=1.0)
    suggested_action: str
    requires_human: bool

# Use with OpenAI structured outputs
response = await client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=messages,
    response_format=TicketAnalysis  # Enforces schema
)

# Guaranteed structured output
analysis: TicketAnalysis = response.choices[0].message.parsed

# Safe to use in business logic
if analysis.priority == "urgent" and analysis.requires_human:
    await escalate_to_human(ticket_id)
```

### Output Validation & Fallback

```python
async def execute_agent_with_validation(
    prompt: str,
    output_schema: type[BaseModel]
) -> BaseModel:
    """
    Execute agent with output validation and fallback.
    """
    try:
        # Attempt structured output
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[{"role": "user", "content": prompt}],
            response_format=output_schema
        )

        result = response.choices[0].message.parsed

        # Validate output
        if result is None:
            raise ValueError("Failed to parse output")

        return result

    except Exception as e:
        logger.error(f"Structured output failed: {e}")

        # Fallback behavior
        return output_schema(
            **get_safe_defaults(output_schema)
        )

def get_safe_defaults(schema: type[BaseModel]) -> dict:
    """Return safe default values for schema"""
    defaults = {}
    for field_name, field in schema.__fields__.items():
        if field.required:
            defaults[field_name] = get_default_value(field.type_)
    return defaults
```

---

## Templated Prompts ⭐

**CRITICAL:** Prompts must be templated and stored separately from code

### Why Templated Prompts

**Problems with inline prompts:**
- Hard to version control
- Difficult to A/B test
- No separation of concerns
- Can't update without code deploy

**Solution:** Template-based prompts

### Prompt Template System

```python
# prompts/templates/customer_support.txt
You are a helpful customer support AI assistant.

Organization: {org_name}
Customer: {customer_name}
Conversation Context: {context}

Your goal is to {goal}.

Rules:
- Be concise and professional
- Always cite sources when using knowledge base
- Escalate to human if unsure

Customer Question: {question}

# Prompt template loader
class PromptTemplate:
    def __init__(self, template_path: str):
        with open(template_path) as f:
            self.template = f.read()

    def render(self, **kwargs) -> str:
        """Render template with variables"""
        try:
            return self.template.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing template variable: {e}")

# Prompt registry
class PromptRegistry:
    def __init__(self, templates_dir: str):
        self.templates: dict[str, PromptTemplate] = {}
        self.load_templates(templates_dir)

    def load_templates(self, directory: str):
        """Load all .txt files from templates directory"""
        for filepath in Path(directory).glob("*.txt"):
            name = filepath.stem
            self.templates[name] = PromptTemplate(str(filepath))

    def get(self, name: str) -> PromptTemplate:
        if name not in self.templates:
            raise ValueError(f"Template not found: {name}")
        return self.templates[name]

# Usage in agent
class CustomerSupportAgent:
    def __init__(self, prompts: PromptRegistry, tools: ToolRegistry):
        self.prompts = prompts
        self.tools = tools

    async def respond(self, question: str, context: dict) -> str:
        # Load template (not hardcoded!)
        template = self.prompts.get("customer_support")

        # Render with context
        system_prompt = template.render(
            org_name=context["org_name"],
            customer_name=context["customer_name"],
            context=context.get("history", ""),
            goal="answer customer questions accurately",
            question=question
        )

        # Execute with templated prompt
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt}
            ]
        )

        return response.choices[0].message.content
```

### Prompt Versioning

```python
# prompts/templates/v1/customer_support.txt
# prompts/templates/v2/customer_support.txt

class VersionedPromptRegistry(PromptRegistry):
    def get(self, name: str, version: str = "latest") -> PromptTemplate:
        """Get prompt by name and version"""
        if version == "latest":
            version = self.get_latest_version(name)

        template_path = f"{self.templates_dir}/{version}/{name}.txt"
        return PromptTemplate(template_path)

    def get_latest_version(self, name: str) -> str:
        """Get latest version number for template"""
        versions = sorted(Path(self.templates_dir).glob(f"v*/{name}.txt"))
        return versions[-1].parent.name if versions else "v1"
```

---

## Agent Configuration

```python
class AgentConfig(BaseModel):
    name: str
    description: str
    model: str = "gpt-4o"
    prompt_template: str  # Template name, not inline prompt!
    tools: list[str] = []  # enabled tool names
    max_turns: int = 10
    temperature: float = 0.7
    output_schema: str | None = None  # Schema class name if using structured outputs

    # Multi-agent coordination
    supervisor_mode: bool = False  # True if this agent supervises others
    delegate_to: list[str] = []  # Agent names this can delegate to

    # State management
    memory_type: str = "conversation"  # conversation | long_term | none
    max_context_length: int = 4000

# Agent instance with config
agent = Agent(
    config=AgentConfig(
        name="customer_support",
        prompt_template="customer_support_v2",  # Reference to template
        tools=["search_kb", "create_ticket", "send_email"],
        output_schema="TicketAnalysis"
    ),
    tools=tool_registry,
    prompts=prompt_registry
)
```

## Error Handling

```python
try:
    result = await execute_agent(run)
    run.status = "completed"
    run.output = result
except TimeoutError:
    run.status = "timeout"
except Exception as e:
    run.status = "failed"
    run.output = {"error": str(e)}
finally:
    run.completed_at = datetime.utcnow()
    await repo.update(run)
```

---

## Agent Copilot Features (Optional)

<!-- [CHANGE] Remove this section if not building agent assist features -->

**Pattern:** AI agents can serve dual roles - customer-facing chatbot AND agent copilot

### Copilot Capabilities

```python
class AgentCopilot:
    """AI assistant for human support agents"""

    async def suggest_reply(self, conversation_id: UUID) -> SuggestedReply:
        """Generate suggested response for agent"""
        context = await self.get_conversation_context(conversation_id)
        kb_results = await self.search_kb(context.latest_message)

        suggestion = await self.llm.generate(
            prompt=self.prompts.get("suggest_reply"),
            context={
                "conversation": context,
                "kb_results": kb_results,
                "sentiment": await self.analyze_sentiment(context)
            }
        )

        return SuggestedReply(
            response=suggestion.response,
            confidence=suggestion.confidence,
            sources=kb_results,
            one_click_applicable=suggestion.confidence > 0.8
        )

    async def retrieve_kb_context(self, query: str, org_id: UUID) -> list[KBResult]:
        """Retrieve relevant KB articles for agent reference"""
        return await self.rag_service.search(org_id, query, top_k=5)

    async def summarize_ticket(self, ticket_id: UUID) -> TicketSummary:
        """Generate ticket summary for agent review"""
        ticket = await self.ticket_repo.get(ticket_id)
        messages = await self.message_repo.get_by_ticket(ticket_id)

        return await self.llm.generate(
            prompt=self.prompts.get("summarize_ticket"),
            context={"ticket": ticket, "messages": messages},
            schema=TicketSummary
        )

    async def detect_intent_urgency(self, message: str) -> MessageAnalysis:
        """Real-time NLP for intent, sentiment, urgency detection"""
        analysis = await self.nlp_service.analyze(message)

        return MessageAnalysis(
            intent=analysis.intent,  # question, complaint, request, feedback
            sentiment=analysis.sentiment,  # positive, neutral, negative
            urgency=analysis.urgency,  # low, medium, high, critical
            is_complaint=analysis.is_complaint,
            suggested_category=analysis.category
        )
```

### One-Click Responses

```python
class OneClickResponse:
    """Pre-approved responses agents can send with one click"""

    async def get_one_click_options(
        self,
        conversation_id: UUID
    ) -> list[QuickResponse]:
        """Get applicable one-click responses"""
        context = await self.get_conversation_context(conversation_id)
        intent = await self.detect_intent(context.latest_message)

        # Match intent to pre-approved templates
        templates = await self.template_repo.get_by_intent(intent)

        # Personalize templates with context
        return [
            QuickResponse(
                template_id=t.id,
                text=await self.personalize(t, context),
                confidence=await self.calculate_relevance(t, context)
            )
            for t in templates
        ]
```

### Copilot UI Integration

```typescript
// Frontend: Agent copilot panel
interface CopilotSuggestion {
  type: 'reply' | 'kb_article' | 'ticket_summary' | 'quick_response';
  content: string;
  confidence: number;
  sources?: KBSource[];
  oneClickApplicable: boolean;
}

function AgentCopilotPanel({ conversationId }: Props) {
  const { suggestions, loading } = useCopilotSuggestions(conversationId);

  return (
    <div className="copilot-panel">
      <h3>AI Assistance</h3>

      {suggestions.map(suggestion => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApply={() => applySuggestion(suggestion)}
          onDismiss={() => dismissSuggestion(suggestion)}
        />
      ))}

      <KBSearchPanel conversationId={conversationId} />
    </div>
  );
}
```

### NLP Intelligence

```python
class NLPService:
    """Real-time NLP for agent assistance"""

    async def analyze(self, message: str) -> MessageAnalysis:
        """Comprehensive message analysis"""
        return MessageAnalysis(
            intent=await self.classify_intent(message),
            sentiment=await self.analyze_sentiment(message),
            urgency=await self.detect_urgency(message),
            entities=await self.extract_entities(message),
            topics=await self.extract_topics(message),
            is_complaint=await self.detect_complaint(message),
            suggested_category=await self.suggest_category(message),
            language=await self.detect_language(message)
        )
```

---

## Rules Summary

1. ✅ **Tool layer required** - Agents never access DB/APIs directly
2. ✅ **Structured outputs** - Use schemas for production agents
3. ✅ **Templated prompts** - Version-controlled, not inline
4. ✅ **Multi-agent coordination** - Supervisor pattern for complex tasks
5. ✅ **Deterministic workflows** - FSM for predictable behavior
6. ✅ **State management** - Persistent memory where needed
7. ✅ **Tenant scoping** - All tools enforce organization_id
8. ✅ **Audit logging** - Track all agent actions
9. ✅ **Error handling** - Graceful failures with retries
10. ✅ **Token tracking** - Log usage for billing

**Result:** Production-ready AI agents with safety, reliability, and observability.
