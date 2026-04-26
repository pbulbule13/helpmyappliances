# Smart Ticketing & Automation Rules

## Features (per PRD)

- Automatic ticket creation from conversations
- Auto categorization and priority detection
- Smart ticket routing (by skill, load, AI-suggested)
- SLA prediction and breach alerts
- Duplicate ticket detection
- Ticket summarization
- Auto-reply generation
- Auto ticket closing
- Auto escalation
- Workflow automation

---

## Ticket Schema

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    conversation_id UUID REFERENCES conversations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),

    -- Core fields
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, pending, resolved, closed
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low, medium, high, urgent
    category VARCHAR(100),
    tags TEXT[],

    -- Assignment
    assigned_agent_id UUID REFERENCES agents(id),
    assigned_at TIMESTAMPTZ,

    -- SLA
    sla_due_at TIMESTAMPTZ,
    sla_breach_at TIMESTAMPTZ,

    -- AI-generated
    summary TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_org_status ON tickets(organization_id, status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_agent_id, status);
CREATE INDEX idx_tickets_sla ON tickets(sla_due_at) WHERE sla_breach_at IS NULL;
```

---

## Auto-Categorization

```python
async def categorize_ticket(ticket: Ticket) -> TicketCategory:
    # Use NLP (intent, sentiment, urgency) or rules
    analysis = await nlp_service.analyze(ticket.subject, ticket.description)

    return TicketCategory(
        category=analysis.intent,
        priority=map_urgency_to_priority(analysis.urgency),
        sentiment=analysis.sentiment,
        tags=analysis.topics
    )
```

---

## Smart Routing ⭐

**CRITICAL:** Routing and escalation logic must be configurable (rules or ML)

**NEVER hardcode agent IDs** - routing must be dynamic and data-driven

### Configurable Routing Strategies

```python
from enum import Enum
from pydantic import BaseModel

class RoutingStrategy(str, Enum):
    """Configurable routing strategies"""
    ROUND_ROBIN = "round_robin"
    LEAST_LOADED = "least_loaded"
    SKILL_BASED = "skill_based"
    AI_SUGGESTED = "ai_suggested"
    PRIORITY_WEIGHTED = "priority_weighted"

class RoutingConfig(BaseModel):
    """Per-organization routing configuration"""
    organization_id: UUID
    strategy: RoutingStrategy = RoutingStrategy.SKILL_BASED
    skill_matching_strict: bool = True  # Require exact skills vs partial
    load_balancing_enabled: bool = True
    ai_routing_enabled: bool = False  # Use AI for routing decisions
    priority_weights: dict[str, float] = {
        "urgent": 1.0,
        "high": 0.75,
        "medium": 0.5,
        "low": 0.25
    }
    max_tickets_per_agent: int = 10
    business_hours_only: bool = False

class ConfigurableTicketRouter:
    """
    Ticket router with configurable strategies.

    CRITICAL: No hardcoded agent assignments!
    All routing based on configuration and agent metadata.
    """

    def __init__(
        self,
        config_repo: RoutingConfigRepository,
        agent_repo: AgentRepository
    ):
        self.config_repo = config_repo
        self.agent_repo = agent_repo

    async def route(self, ticket: Ticket) -> Agent | None:
        """Route ticket based on organization configuration"""

        # 1. Load organization routing config (not hardcoded!)
        config = await self.config_repo.get_by_org(ticket.organization_id)
        if not config:
            config = RoutingConfig(organization_id=ticket.organization_id)

        # 2. Get required skills for ticket
        required_skills = await self.get_required_skills(ticket, config)

        # 3. Find available agents
        candidates = await self.find_available_agents(
            ticket.organization_id,
            required_skills,
            config
        )

        if not candidates:
            logger.warning(
                "no_agents_available",
                organization_id=str(ticket.organization_id),
                ticket_id=str(ticket.id),
                required_skills=required_skills
            )
            return None

        # 4. Select agent using configured strategy
        agent = await self.select_agent(ticket, candidates, config)

        logger.info(
            "ticket_routed",
            organization_id=str(ticket.organization_id),
            ticket_id=str(ticket.id),
            agent_id=str(agent.id),
            strategy=config.strategy,
            candidate_count=len(candidates)
        )

        return agent

    async def find_available_agents(
        self,
        org_id: UUID,
        required_skills: list[str],
        config: RoutingConfig
    ) -> list[Agent]:
        """Find agents matching criteria"""

        # Base query: active agents in organization
        query_filters = {
            "organization_id": org_id,
            "status": "active",
            "available": True
        }

        # Skill matching (configurable strictness)
        if config.skill_matching_strict:
            # Must have ALL required skills
            query_filters["skills__contains_all"] = required_skills
        else:
            # Must have AT LEAST ONE required skill
            query_filters["skills__contains_any"] = required_skills

        # Check current workload
        if config.load_balancing_enabled:
            query_filters["current_tickets__lt"] = config.max_tickets_per_agent

        # Business hours constraint
        if config.business_hours_only:
            current_hour = datetime.utcnow().hour
            query_filters["working_hours__contains"] = current_hour

        return await self.agent_repo.find_all(query_filters)

    async def select_agent(
        self,
        ticket: Ticket,
        candidates: list[Agent],
        config: RoutingConfig
    ) -> Agent:
        """Select best agent from candidates using strategy"""

        if config.strategy == RoutingStrategy.ROUND_ROBIN:
            return await self._round_robin_select(ticket.organization_id, candidates)

        elif config.strategy == RoutingStrategy.LEAST_LOADED:
            return min(candidates, key=lambda a: a.current_ticket_count)

        elif config.strategy == RoutingStrategy.SKILL_BASED:
            return await self._skill_match_select(ticket, candidates)

        elif config.strategy == RoutingStrategy.AI_SUGGESTED:
            return await self._ai_suggest_agent(ticket, candidates)

        elif config.strategy == RoutingStrategy.PRIORITY_WEIGHTED:
            return await self._priority_weighted_select(ticket, candidates, config)

        else:
            # Default to least loaded
            return min(candidates, key=lambda a: a.current_ticket_count)

    async def _ai_suggest_agent(
        self,
        ticket: Ticket,
        candidates: list[Agent]
    ) -> Agent:
        """Use AI to suggest best agent (ML-based routing)"""

        prompt = f"""
        Given this ticket and available agents, which agent is best suited?

        Ticket:
        - Category: {ticket.category}
        - Priority: {ticket.priority}
        - Subject: {ticket.subject}

        Available Agents:
        {self._format_agent_list(candidates)}

        Return agent_id of best match.
        """

        # Use structured output for reliable parsing
        response = await llm_client.generate_structured(
            prompt,
            output_schema=AgentSelection
        )

        selected = next((a for a in candidates if a.id == response.agent_id), None)
        return selected or candidates[0]  # Fallback to first if AI fails
```

### Routing Configuration Management

```python
# Admin endpoint to configure routing
@router.put("/api/v1/admin/routing-config")
async def update_routing_config(
    org_id: UUID,
    config: RoutingConfig,
    auth: AuthContext = Depends(require_role("admin", "team_owner"))
):
    """Update organization routing configuration"""

    # Validate org membership
    await validate_org_access(auth, org_id)

    # Save configuration (not hardcoded!)
    await routing_config_repo.upsert(config)

    logger.info(
        "routing_config_updated",
        organization_id=str(org_id),
        strategy=config.strategy,
        updated_by=str(auth.user.id)
    )

    return {"status": "updated", "config": config}
```

### Anti-Patterns (NEVER Do This)

```python
# ❌ WRONG - Hardcoded agent IDs
async def route_ticket_bad(ticket: Ticket) -> Agent:
    if ticket.category == "billing":
        return await get_agent("agent_12345")  # HARDCODED!
    elif ticket.priority == "urgent":
        return await get_agent("agent_67890")  # HARDCODED!
    else:
        return await get_agent("agent_11111")  # HARDCODED!

# ❌ WRONG - Non-configurable logic
async def route_ticket_bad(ticket: Ticket) -> Agent:
    # Logic embedded in code - can't change without deployment
    agents = await get_all_agents()
    return agents[0]  # Always first agent!

# ✅ CORRECT - Configurable, data-driven
async def route_ticket_good(ticket: Ticket) -> Agent:
    # Uses configuration from database
    config = await get_routing_config(ticket.organization_id)
    candidates = await find_agents_by_skills(ticket.required_skills)
    return await select_by_strategy(candidates, config.strategy)
```

---

## SLA Management

```python
# Background job: Check SLA breaches
@scheduler.scheduled_job("interval", minutes=5)
async def check_sla_breaches():
    breaching_tickets = await ticket_repo.find_breaching(
        threshold=timedelta(minutes=15)  # Alert 15 min before breach
    )

    for ticket in breaching_tickets:
        await notify_sla_breach(ticket)
        await log_usage_event(
            org_id=ticket.organization_id,
            event_type="sla_breach_alert",
            metadata={"ticket_id": str(ticket.id)}
        )
```

---

## Duplicate Detection ⭐

**Use embedding-based similarity + keywords + customer history**

### Multi-Strategy Duplicate Detection

```python
from dataclasses import dataclass

@dataclass
class DuplicateMatch:
    """Represents a potential duplicate ticket"""
    ticket: Ticket
    similarity_score: float
    match_method: str  # embedding, keyword, customer_history
    confidence: str  # high, medium, low

class DuplicateDetector:
    """Multi-strategy duplicate detection"""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: VectorStore,
        ticket_repo: TicketRepository
    ):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.ticket_repo = ticket_repo

    async def find_duplicates(
        self,
        ticket: Ticket,
        threshold: float = 0.85,
        lookback_days: int = 30
    ) -> list[DuplicateMatch]:
        """
        Find potential duplicate tickets using multiple strategies.

        Returns ranked list of potential duplicates.
        """
        all_matches: list[DuplicateMatch] = []

        # Strategy 1: Embedding-based semantic similarity (BEST)
        embedding_matches = await self._find_by_embedding(
            ticket,
            threshold,
            lookback_days
        )
        all_matches.extend(embedding_matches)

        # Strategy 2: Keyword/title matching
        keyword_matches = await self._find_by_keywords(ticket, lookback_days)
        all_matches.extend(keyword_matches)

        # Strategy 3: Same customer + recent timeframe
        customer_matches = await self._find_by_customer(ticket, lookback_days)
        all_matches.extend(customer_matches)

        # Deduplicate and rank
        deduplicated = self._deduplicate_matches(all_matches)
        ranked = sorted(deduplicated, key=lambda m: m.similarity_score, reverse=True)

        return ranked[:5]  # Top 5 matches

    async def _find_by_embedding(
        self,
        ticket: Ticket,
        threshold: float,
        lookback_days: int
    ) -> list[DuplicateMatch]:
        """
        Embedding-based semantic similarity (RECOMMENDED).

        Most accurate method - finds tickets with similar meaning
        even if wording is different.
        """
        # Combine subject + description for better matching
        text = f"{ticket.subject}\n{ticket.description}"

        # Generate embedding
        embedding = await self.embedding_service.embed(text)

        # Search vector store
        since = datetime.utcnow() - timedelta(days=lookback_days)

        similar_tickets = await self.vector_store.search(
            embedding=embedding,
            filter={
                "organization_id": str(ticket.organization_id),
                "type": "ticket",
                "created_at__gte": since.isoformat(),
                "status__in": ["open", "pending", "resolved"]  # Exclude closed
            },
            threshold=threshold,
            limit=10
        )

        return [
            DuplicateMatch(
                ticket=result.ticket,
                similarity_score=result.score,
                match_method="embedding",
                confidence=self._score_to_confidence(result.score)
            )
            for result in similar_tickets
            if result.ticket.id != ticket.id  # Exclude self
        ]

    async def _find_by_keywords(
        self,
        ticket: Ticket,
        lookback_days: int
    ) -> list[DuplicateMatch]:
        """
        Keyword/title matching (FAST fallback).

        Good for exact phrase matches.
        """
        since = datetime.utcnow() - timedelta(days=lookback_days)

        # Extract key phrases from title
        keywords = self._extract_keywords(ticket.subject)

        if not keywords:
            return []

        # Search by keywords
        matches = await self.ticket_repo.search_by_keywords(
            organization_id=ticket.organization_id,
            keywords=keywords,
            since=since,
            exclude_id=ticket.id
        )

        return [
            DuplicateMatch(
                ticket=match,
                similarity_score=match.keyword_match_score,
                match_method="keyword",
                confidence="medium"
            )
            for match in matches
        ]

    async def _find_by_customer(
        self,
        ticket: Ticket,
        lookback_days: int
    ) -> list[DuplicateMatch]:
        """
        Same customer + recent timeframe.

        Catches customer reopening same issue.
        """
        since = datetime.utcnow() - timedelta(days=lookback_days)

        recent = await self.ticket_repo.find_by_customer(
            customer_id=ticket.customer_id,
            organization_id=ticket.organization_id,
            since=since,
            exclude_id=ticket.id
        )

        return [
            DuplicateMatch(
                ticket=t,
                similarity_score=0.7,  # Medium confidence for customer match
                match_method="customer_history",
                confidence="medium"
            )
            for t in recent
        ]

    def _deduplicate_matches(
        self,
        matches: list[DuplicateMatch]
    ) -> list[DuplicateMatch]:
        """Remove duplicate matches (same ticket found via multiple methods)"""
        seen: set[UUID] = set()
        deduplicated: list[DuplicateMatch] = []

        for match in matches:
            if match.ticket.id not in seen:
                seen.add(match.ticket.id)
                deduplicated.append(match)

        return deduplicated

    def _score_to_confidence(self, score: float) -> str:
        """Convert similarity score to confidence level"""
        if score >= 0.95:
            return "high"
        elif score >= 0.85:
            return "medium"
        else:
            return "low"

    def _extract_keywords(self, text: str) -> list[str]:
        """Extract important keywords from text"""
        # Remove stop words, extract nouns/verbs
        # Use NLP library like spaCy
        import re
        words = re.findall(r'\b\w{4,}\b', text.lower())  # Words 4+ chars
        return list(set(words))[:10]  # Top 10 unique words

# Usage in ticket creation
async def create_ticket(ticket_data: TicketCreate, org_id: UUID):
    # Create ticket
    ticket = await ticket_repo.create(ticket_data, org_id)

    # Check for duplicates
    duplicates = await duplicate_detector.find_duplicates(ticket)

    if duplicates:
        # High confidence duplicate found
        if duplicates[0].confidence == "high":
            logger.warning(
                "potential_duplicate_detected",
                ticket_id=str(ticket.id),
                duplicate_id=str(duplicates[0].ticket.id),
                similarity=duplicates[0].similarity_score
            )

            # Link tickets or notify agent
            await link_duplicate_tickets(ticket, duplicates[0].ticket)

        # Store duplicate suggestions in metadata
        ticket.metadata["potential_duplicates"] = [
            {
                "ticket_id": str(d.ticket.id),
                "score": d.similarity_score,
                "method": d.match_method
            }
            for d in duplicates[:3]  # Top 3
        ]
        await ticket_repo.update(ticket)

    return ticket
```

### Duplicate Prevention Workflow

```python
# Frontend can use this to warn before creating ticket
@router.post("/api/v1/tickets/check-duplicates")
async def check_for_duplicates(
    data: DuplicateCheckRequest,
    org_id: UUID = Depends(get_current_org)
) -> list[DuplicateMatch]:
    """
    Check for potential duplicates before creating ticket.

    Called by frontend to show "Similar tickets exist" warning.
    """
    temp_ticket = Ticket(
        organization_id=org_id,
        subject=data.subject,
        description=data.description,
        customer_id=data.customer_id
    )

    duplicates = await duplicate_detector.find_duplicates(temp_ticket)

    return duplicates
```

---

## Automation Rules

```python
class TicketAutomation:
    async def auto_reply(self, ticket: Ticket):
        if ticket.category in self.auto_reply_categories:
            reply = await self.generate_reply(ticket)
            await self.send_reply(ticket, reply)
            await self.log_action(ticket, "auto_reply")

    async def auto_close(self, ticket: Ticket):
        # Only close if: resolved, customer confirmed, no complaints
        if await self.can_auto_close(ticket):
            ticket.status = "closed"
            ticket.closed_at = datetime.utcnow()
            await self.ticket_repo.update(ticket)
            await self.log_action(ticket, "auto_close")

    async def auto_escalate(self, ticket: Ticket):
        if await self.should_escalate(ticket):
            await self.escalate(ticket)
            await self.notify_escalation(ticket)
            await self.log_action(ticket, "auto_escalate")
```

---

## Rules

1. **Tickets are first-class entities** — link to conversations and messages
2. **Keep logic in services** — not in HTTP handlers
3. **Configurable routing** — support rules or ML; no hardcoded agent IDs
4. **SLA jobs are scheduled** — run in background workers, not blocking HTTP
5. **Audit all automation** — log actions for compliance and debugging
6. **Idempotency** — prevent duplicate processing in async flows

---

## Do Not

- Put ticket creation/routing only in HTTP handlers — support async ingestion
- Assume single-tenant — scope all queries by `organization_id`
- Auto-close without respecting business rules (customer confirmation, no open complaints)
- Trigger automation without audit trail
