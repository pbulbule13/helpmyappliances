# Code Coverage Rules

<!-- [CHANGE] Update coverage requirements and tools for your tech stack -->

## Coverage Requirements ⭐

**Target: 100% coverage for critical code, 80%+ overall**

### Coverage Tiers

| Code Type | Minimum Coverage | Rationale |
|-----------|------------------|-----------|
| **Security-critical** | 100% | Auth, permissions, encryption |
| **Business logic** | 95% | Services, domain models |
| **API endpoints** | 90% | Controllers, routes |
| **Data access** | 90% | Repositories, database queries |
| **Utilities** | 85% | Helper functions, formatters |
| **Infrastructure** | 70% | Config, setup code |

---

## What Must Have 100% Coverage

### 1. Authentication & Authorization

**Critical Path - Zero Tolerance for Bugs**

```python
# MUST have 100% coverage
class AuthService:
    async def login(self, credentials: Credentials) -> Session:
        # Test: valid credentials
        # Test: invalid password
        # Test: non-existent user
        # Test: disabled account
        # Test: rate limiting
        pass

    async def verify_token(self, token: str) -> User:
        # Test: valid token
        # Test: expired token
        # Test: invalid signature
        # Test: missing claims
        # Test: revoked token
        pass

# Test coverage requirement
@pytest.mark.security
class TestAuthService:
    """100% coverage required for security"""

    async def test_login_success(self): ...
    async def test_login_invalid_password(self): ...
    async def test_login_nonexistent_user(self): ...
    async def test_login_disabled_account(self): ...
    async def test_login_rate_limited(self): ...
    async def test_verify_token_valid(self): ...
    async def test_verify_token_expired(self): ...
    async def test_verify_token_invalid(self): ...
    async def test_verify_token_missing_claims(self): ...
    async def test_verify_token_revoked(self): ...
```

### 2. Multi-Tenant Data Scoping

**Security Vulnerability if Wrong**

```python
# MUST have 100% coverage
class DocumentRepository:
    async def get(self, doc_id: UUID, org_id: UUID) -> Document:
        # Test: document exists in org
        # Test: document exists but different org (SECURITY!)
        # Test: document doesn't exist
        # Test: null org_id rejected
        pass

# Test coverage
class TestTenantIsolation:
    """100% coverage required - prevents data leaks"""

    async def test_get_document_in_org(self): ...
    async def test_get_document_different_org_denied(self): ...  # CRITICAL
    async def test_get_document_not_found(self): ...
    async def test_get_document_null_org_rejected(self): ...
```

### 3. Payment & Billing

**Money is Involved**

```python
# MUST have 100% coverage
class BillingService:
    async def charge_customer(self, amount: Decimal, customer_id: str):
        # Test: successful charge
        # Test: insufficient funds
        # Test: invalid amount (negative, zero, too large)
        # Test: invalid customer
        # Test: idempotency (duplicate charge prevention)
        # Test: refund scenarios
        pass
```

### 4. Data Encryption & Secrets

**Critical for Compliance**

```python
# MUST have 100% coverage
def encrypt_sensitive_data(data: str, key: bytes) -> bytes:
    # Test: successful encryption
    # Test: successful decryption
    # Test: tampered ciphertext rejected
    # Test: wrong key fails
    # Test: empty data handling
    pass
```

---

## Coverage Tools & Configuration

### Python (pytest-cov)

```bash
# Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term --cov-fail-under=80

# Coverage configuration
# .coveragerc or pyproject.toml
[tool.coverage.run]
source = ["app"]
omit = [
    "*/tests/*",
    "*/migrations/*",
    "*/__init__.py",
    "*/config.py"
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
    "@abstractmethod"
]

fail_under = 80

[tool.coverage.html]
directory = "htmlcov"
```

### JavaScript/TypeScript (Jest)

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/__tests__/",
    "/coverage/"
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 100% for critical files
    "./src/auth/**/*.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    "./src/security/**/*.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
```

### Go (go test -cover)

```bash
# Run with coverage
go test -coverprofile=coverage.out ./...

# View coverage report
go tool cover -html=coverage.out

# Fail if below threshold
go test -coverprofile=coverage.out ./... && \
  go tool cover -func=coverage.out | \
  grep total | \
  awk '{if ($3+0 < 80) exit 1}'
```

---

## CI/CD Integration

### Enforce Coverage in Pipeline

```yaml
# GitHub Actions example
name: Test & Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests with coverage
        run: pytest --cov=app --cov-fail-under=80

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
          fail_ci_if_error: true

      - name: Comment coverage on PR
        uses: py-cov-action/python-coverage-comment-action@v3
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MINIMUM_GREEN: 90
          MINIMUM_ORANGE: 80
```

---

## Coverage Best Practices

### 1. Test All Branches

```python
def process_payment(amount: Decimal, method: str) -> Result:
    if amount <= 0:
        return Result(success=False, error="Invalid amount")  # Test this!

    if method == "card":
        return charge_card(amount)  # Test this!
    elif method == "bank":
        return charge_bank(amount)  # Test this!
    else:
        return Result(success=False, error="Unknown method")  # Test this!

# MUST test all 5 branches
def test_process_payment_invalid_amount(): ...
def test_process_payment_card_success(): ...
def test_process_payment_bank_success(): ...
def test_process_payment_unknown_method(): ...
def test_process_payment_zero_amount(): ...
```

### 2. Test Edge Cases

```python
def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Division by zero")
    return a / b

# Test edge cases
def test_divide_normal(): assert divide(10, 2) == 5
def test_divide_negative(): assert divide(-10, 2) == -5
def test_divide_zero_numerator(): assert divide(0, 5) == 0
def test_divide_zero_denominator():
    with pytest.raises(ValueError):
        divide(10, 0)
def test_divide_very_small(): assert divide(0.0001, 0.0001) == 1
```

### 3. Test Error Paths

```python
async def fetch_user(user_id: str) -> User:
    try:
        return await db.query(User).filter_by(id=user_id).one()
    except NoResultFound:
        raise UserNotFoundError(f"User {user_id} not found")  # Test this!
    except DatabaseError as e:
        logger.error(f"Database error: {e}")  # Test this!
        raise ServiceUnavailableError("Database error")

# Test both success and error paths
async def test_fetch_user_success(): ...
async def test_fetch_user_not_found(): ...
async def test_fetch_user_database_error(): ...
```

---

## Coverage Exceptions

### When to Use `pragma: no cover`

**Acceptable:**
- Abstract methods (will be covered in implementations)
- Debug-only code
- Type checking blocks (`if TYPE_CHECKING:`)
- Unreachable safety checks

```python
from abc import abstractmethod
from typing import TYPE_CHECKING

# OK to skip
@abstractmethod
def process(self, data: Any) -> Result:
    pass  # pragma: no cover

# OK to skip
if TYPE_CHECKING:  # pragma: no cover
    from .models import User

# OK to skip (defensive programming)
def process(value: PositiveInt) -> Result:
    if value < 0:  # pragma: no cover
        # Should never happen due to type validation
        raise ValueError("Negative value")
    return process_positive(value)
```

**NOT Acceptable:**
- Business logic
- Error handling
- Security checks
- Data validation

---

## Mutation Testing (Advanced)

**Beyond line coverage - test your tests**

```bash
# Python: mutmut
pip install mutmut
mutmut run

# JavaScript: Stryker
npm install --save-dev @stryker-mutator/core
npx stryker run
```

**Why:** 100% line coverage doesn't mean tests are good. Mutation testing changes your code and checks if tests catch it.

---

## Coverage Reports

### Generate and Review

```bash
# Python
pytest --cov=app --cov-report=html
open htmlcov/index.html

# JavaScript
npm test -- --coverage
open coverage/lcov-report/index.html

# Go
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Weekly Review

- Check coverage trends (increasing or decreasing?)
- Identify uncovered critical code
- Add tests for security-sensitive areas
- Remove dead code (0% coverage and unused)

---

## Rules Summary

1. ✅ **100% coverage for security-critical code** (auth, permissions, encryption)
2. ✅ **100% coverage for multi-tenant scoping** (prevent data leaks)
3. ✅ **100% coverage for billing/payments** (prevent financial errors)
4. ✅ **95%+ coverage for business logic** (services, domain models)
5. ✅ **90%+ coverage for API endpoints** (controllers, routes)
6. ✅ **80%+ overall coverage** (entire codebase)
7. ✅ **Test all branches** (if/else, switch, try/catch)
8. ✅ **Test edge cases** (null, zero, negative, very large)
9. ✅ **Test error paths** (exceptions, failures)
10. ✅ **Enforce coverage in CI/CD** (fail builds below threshold)
11. ✅ **Review coverage weekly** (trends, gaps, dead code)
12. ❌ **Never skip security tests** (no `pragma: no cover` for auth/security)

---

## Integration with Test Organization

See `24-test-organization.md` for test folder structure and organization.

Coverage reports should map to test structure:
- Unit tests cover business logic
- Integration tests cover API endpoints
- E2E tests cover critical user flows

**Goal:** Every line of critical code tested, every test meaningful.
