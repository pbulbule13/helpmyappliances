# Testing Rules

## Test Structure

```
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   └── flows/
├── conftest.py
└── factories/
```

## Rules

1. **Test pyramid** — many unit tests, fewer integration, minimal e2e
2. **Mock external services** — OpenAI, Stripe, AWS in unit tests
3. **Use factories** — don't create test data manually
4. **Isolate tests** — each test starts with clean state
5. **Test tenant isolation** — verify cross-tenant data leaks impossible

## Unit Tests

```python
# tests/unit/services/test_conversation_service.py
import pytest
from unittest.mock import AsyncMock

async def test_create_conversation_assigns_to_agent():
    # Arrange
    repo = AsyncMock()
    agent_service = AsyncMock()
    service = ConversationService(repo, agent_service)

    # Act
    conv = await service.create(org_id=ORG_ID, customer_id=CUSTOMER_ID)

    # Assert
    repo.create.assert_called_once()
    agent_service.assign.assert_called_once_with(conv.id)
```

## Integration Tests

```python
# tests/integration/api/test_conversations.py
import pytest
from httpx import AsyncClient

@pytest.fixture
async def client(app, db_session):
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

async def test_create_conversation(client, auth_headers, org):
    response = await client.post(
        f"/api/v1/orgs/{org.id}/conversations",
        json={"channel": "chat", "customer_email": "test@example.com"},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["channel"] == "chat"
```

## Tenant Isolation Tests

```python
async def test_cannot_access_other_org_conversation(client, auth_headers_org_a, conversation_org_b):
    """User from Org A cannot access Org B's conversation"""
    response = await client.get(
        f"/api/v1/orgs/{conversation_org_b.organization_id}/conversations/{conversation_org_b.id}",
        headers=auth_headers_org_a
    )
    assert response.status_code == 403
```

## Factories

```python
# tests/factories/conversation.py
from factory import Factory, Faker, LazyAttribute
from models import Conversation

class ConversationFactory(Factory):
    class Meta:
        model = Conversation

    id = Faker("uuid4")
    organization_id = Faker("uuid4")
    channel = "chat"
    status = "open"
    created_at = Faker("date_time")
```

## Mocking OpenAI

```python
@pytest.fixture
def mock_openai(mocker):
    mock = mocker.patch("infrastructure.openai_client.AsyncOpenAI")
    mock.return_value.chat.completions.create = AsyncMock(
        return_value=ChatCompletion(
            choices=[Choice(message=Message(content="Test response"))]
        )
    )
    return mock
```

## Test Coverage

- Minimum 80% coverage for services and repositories
- 100% coverage for security-critical code (auth, permissions)
- Run coverage in CI: `pytest --cov=app --cov-fail-under=80`

## CI Pipeline

```yaml
test:
  script:
    - pytest tests/unit
    - pytest tests/integration
  coverage: '/TOTAL.+ ([0-9]{1,3}%)/'
```
