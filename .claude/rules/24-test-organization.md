# Test Organization & Folder Structure

<!-- [CHANGE] Update test framework and structure for your tech stack -->

## Clean Test Folder Structure ⭐

**Principle: Tests mirror source code structure**

### Standard Test Directory Layout

```
tests/
├── unit/                    # Fast, isolated unit tests
│   ├── services/           # Business logic tests
│   │   ├── test_auth_service.py
│   │   ├── test_user_service.py
│   │   └── test_ticket_service.py
│   ├── repositories/       # Data access tests
│   │   ├── test_user_repository.py
│   │   └── test_ticket_repository.py
│   ├── models/             # Domain model tests
│   │   ├── test_user_model.py
│   │   └── test_ticket_model.py
│   └── utils/              # Utility function tests
│       ├── test_validators.py
│       └── test_formatters.py
│
├── integration/            # Cross-boundary integration tests
│   ├── api/               # API endpoint tests
│   │   ├── test_auth_endpoints.py
│   │   ├── test_user_endpoints.py
│   │   └── test_ticket_endpoints.py
│   ├── database/          # Database integration tests
│   │   ├── test_migrations.py
│   │   └── test_queries.py
│   └── external/          # External service integration
│       ├── test_payment_gateway.py
│       └── test_email_service.py
│
├── e2e/                   # End-to-end user flow tests
│   ├── flows/
│   │   ├── test_user_registration_flow.py
│   │   ├── test_ticket_creation_flow.py
│   │   └── test_payment_flow.py
│   └── scenarios/
│       ├── test_complete_user_journey.py
│       └── test_critical_paths.py
│
├── performance/           # Load and performance tests
│   ├── test_api_load.py
│   ├── test_database_performance.py
│   └── test_concurrent_users.py
│
├── security/              # Security-specific tests
│   ├── test_auth_vulnerabilities.py
│   ├── test_sql_injection.py
│   ├── test_xss_prevention.py
│   └── test_tenant_isolation.py
│
├── fixtures/              # Shared test fixtures
│   ├── __init__.py
│   ├── database.py        # DB fixtures
│   ├── factories.py       # Object factories
│   └── mocks.py           # Mock objects
│
├── factories/             # Test data factories
│   ├── __init__.py
│   ├── user_factory.py
│   ├── ticket_factory.py
│   └── organization_factory.py
│
├── helpers/               # Test helper functions
│   ├── __init__.py
│   ├── assertions.py      # Custom assertions
│   ├── auth_helpers.py    # Auth test helpers
│   └── api_helpers.py     # API test helpers
│
├── conftest.py            # Pytest configuration & global fixtures
├── pytest.ini             # Pytest settings
└── README.md              # Test documentation

```

---

## Test File Naming Convention

### Pattern: `test_<module_name>.py`

```
Source:              Test:
services/auth.py  →  tests/unit/services/test_auth.py
models/user.py    →  tests/unit/models/test_user.py
api/users.py      →  tests/integration/api/test_users.py
```

### Pattern: `Test<ClassName>` for classes

```python
# Source: services/auth.py
class AuthService:
    pass

# Test: tests/unit/services/test_auth.py
class TestAuthService:
    def test_login_success(self): ...
    def test_login_failure(self): ...
```

---

## conftest.py Structure

**Central configuration and global fixtures**

```python
# tests/conftest.py
"""
Global pytest configuration and fixtures.

Fixtures defined here are available to all tests.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# ==================== Database Fixtures ====================

@pytest.fixture(scope="session")
def db_engine():
    """Create test database engine (once per test session)"""
    engine = create_engine("postgresql://test:test@localhost/test_db")
    yield engine
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create clean database session for each test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

# ==================== API Client Fixtures ====================

@pytest.fixture
def client(app):
    """Test API client"""
    return app.test_client()

@pytest.fixture
def auth_headers(test_user):
    """Authenticated request headers"""
    token = generate_test_token(test_user)
    return {"Authorization": f"Bearer {token}"}

# ==================== Mock Fixtures ====================

@pytest.fixture
def mock_openai(mocker):
    """Mock OpenAI API calls"""
    mock = mocker.patch("app.infrastructure.openai_client.AsyncOpenAI")
    mock.return_value.chat.completions.create.return_value = MockChatCompletion()
    return mock

@pytest.fixture
def mock_stripe(mocker):
    """Mock Stripe API calls"""
    return mocker.patch("stripe.Customer")

# ==================== Test Data Fixtures ====================

@pytest.fixture
def test_user(db_session):
    """Create test user"""
    from tests.factories import UserFactory
    user = UserFactory()
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_organization(db_session):
    """Create test organization"""
    from tests.factories import OrganizationFactory
    org = OrganizationFactory()
    db_session.add(org)
    db_session.commit()
    return org

# ==================== Markers ====================

pytest_configure = lambda config: [
    config.addinivalue_line("markers", "slow: marks tests as slow"),
    config.addinivalue_line("markers", "integration: marks integration tests"),
    config.addinivalue_line("markers", "e2e: marks end-to-end tests"),
    config.addinivalue_line("markers", "security: marks security tests"),
]
```

---

## Test Factories (Factory Pattern)

**Generate test data easily and consistently**

```python
# tests/factories/user_factory.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.models import User
from tests.conftest import db_session

class UserFactory(SQLAlchemyModelFactory):
    """Factory for creating test users"""

    class Meta:
        model = User
        sqlalchemy_session = db_session

    id = factory.Faker("uuid4")
    email = factory.Faker("email")
    name = factory.Faker("name")
    password_hash = factory.LazyFunction(
        lambda: hash_password("Test123!")
    )
    created_at = factory.Faker("date_time_this_year")

# Usage in tests
def test_user_creation():
    user = UserFactory()  # Creates user with random data
    assert user.email is not None

def test_user_with_specific_email():
    user = UserFactory(email="specific@example.com")
    assert user.email == "specific@example.com"

def test_multiple_users():
    users = UserFactory.create_batch(10)  # Create 10 users
    assert len(users) == 10
```

---

## Test Helpers

**Reusable test utilities**

```python
# tests/helpers/assertions.py
"""Custom assertions for cleaner tests"""

def assert_valid_uuid(value: str):
    """Assert value is a valid UUID"""
    import uuid
    try:
        uuid.UUID(value)
    except ValueError:
        pytest.fail(f"{value} is not a valid UUID")

def assert_datetime_recent(dt: datetime, seconds: int = 60):
    """Assert datetime is recent (within last N seconds)"""
    now = datetime.utcnow()
    diff = (now - dt).total_seconds()
    assert diff < seconds, f"Datetime {dt} is {diff}s old (expected < {seconds}s)"

def assert_dict_contains(actual: dict, expected: dict):
    """Assert actual dict contains all expected keys/values"""
    for key, value in expected.items():
        assert key in actual, f"Key {key} not in {actual}"
        assert actual[key] == value, f"Expected {key}={value}, got {actual[key]}"

# tests/helpers/auth_helpers.py
"""Authentication test helpers"""

def create_test_token(user_id: str, org_id: str, role: str = "user") -> str:
    """Create JWT token for testing"""
    from app.core.security import create_access_token
    return create_access_token(
        data={"sub": user_id, "org": org_id, "role": role}
    )

def create_auth_headers(user) -> dict:
    """Create authenticated request headers"""
    token = create_test_token(user.id, user.organization_id, user.role)
    return {"Authorization": f"Bearer {token}"}

# tests/helpers/api_helpers.py
"""API testing helpers"""

async def assert_api_error(response, status_code: int, error_code: str):
    """Assert API error response format"""
    assert response.status_code == status_code
    data = await response.json()
    assert "error" in data
    assert data["error"]["code"] == error_code
```

---

## Test Markers & Organization

**Organize tests by type and run selectively**

```python
# pytest.ini
[pytest]
markers =
    unit: Unit tests (fast, isolated)
    integration: Integration tests (require external services)
    e2e: End-to-end tests (slow, full system)
    security: Security-specific tests
    slow: Slow tests (performance, load)
    smoke: Smoke tests (quick sanity checks)

# Usage in tests
import pytest

@pytest.mark.unit
def test_user_validation():
    """Unit test - fast, no dependencies"""
    pass

@pytest.mark.integration
async def test_api_endpoint():
    """Integration test - requires API"""
    pass

@pytest.mark.e2e
@pytest.mark.slow
async def test_complete_flow():
    """E2E test - tests full user journey"""
    pass

@pytest.mark.security
async def test_sql_injection_prevention():
    """Security test - tests vulnerability"""
    pass
```

### Run Tests Selectively

```bash
# Run only unit tests (fast)
pytest -m unit

# Run integration tests
pytest -m integration

# Run everything except slow tests
pytest -m "not slow"

# Run security tests
pytest -m security

# Run all tests
pytest
```

---

## Test Documentation (README)

```markdown
# tests/README.md

## Running Tests

### Quick Start
\`\`\`bash
# All tests
pytest

# Unit tests only (fast)
pytest -m unit

# With coverage
pytest --cov=app --cov-report=html

# Specific file
pytest tests/unit/services/test_auth.py

# Specific test
pytest tests/unit/services/test_auth.py::test_login_success
\`\`\`

### Test Organization

- `unit/` - Fast, isolated tests (no external dependencies)
- `integration/` - Tests requiring database, APIs, etc.
- `e2e/` - Full user flow tests
- `security/` - Security vulnerability tests
- `performance/` - Load and performance tests

### Writing Tests

1. Mirror source code structure (services → tests/unit/services)
2. Use factories for test data (avoid hardcoded values)
3. Use fixtures for setup/teardown
4. Mark tests appropriately (@pytest.mark.integration)
5. Aim for 100% coverage of critical code

### Test Data

- Use `factories/` for generating test objects
- Use `fixtures/` for reusable test setup
- Never use production data in tests

### CI/CD

Tests run automatically on:
- Every push
- Every PR
- Before deployment

Coverage must be ≥80% to pass CI.
```

---

## Rules Summary

1. ✅ **Mirror source structure** - tests/ matches src/ structure
2. ✅ **Separate by type** - unit, integration, e2e, security, performance
3. ✅ **Use factories** - generate test data, don't hardcode
4. ✅ **Use fixtures** - reusable setup/teardown in conftest.py
5. ✅ **Use markers** - organize and run tests selectively
6. ✅ **Helper functions** - extract common test utilities
7. ✅ **Document tests** - README explains organization and how to run
8. ✅ **Clean isolation** - each test independent, no shared state
9. ✅ **Fast unit tests** - no database, no network, < 1s each
10. ✅ **Name clearly** - test names describe what they test

**Result:** Well-organized, maintainable, fast test suite with high coverage.
