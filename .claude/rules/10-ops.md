# Operations Rules — DevOps & Deployment

## Environments

| Environment | Purpose | Database | URL |
|-------------|---------|----------|-----|
| `dev` | Local development | Local Postgres | localhost:3000/8000 |
| `staging` | Pre-prod testing | Staging RDS | staging.example.com |
| `prod` | Production | Prod RDS | app.example.com |

**Rule:** Never share databases between environments.

## Docker

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: .env

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: customercare
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

## AWS Architecture

```
┌─────────────────────────────────────────────────┐
│                   CloudFront                     │
├────────────────────┬────────────────────────────┤
│   Next.js (ECS)    │    FastAPI (ECS)           │
├────────────────────┴────────────────────────────┤
│              Application Load Balancer           │
├────────────────────┬────────────────────────────┤
│     RDS Postgres   │    ElastiCache Redis       │
├────────────────────┴────────────────────────────┤
│                      S3                          │
│  (documents, recordings, static assets)          │
└─────────────────────────────────────────────────┘
```

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          docker compose -f docker-compose.test.yml up --abort-on-container-exit

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster prod --service backend --force-new-deployment
```

## Secrets Management

- Use AWS Secrets Manager or Parameter Store
- Never commit secrets to git
- Rotate secrets regularly
- Different secrets per environment

```python
# Load from environment
DATABASE_URL = os.environ["DATABASE_URL"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
```

## Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "add_call_sessions"

# Apply migrations (run in CI before deploy)
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

## Health Checks

```python
@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_session)):
    # Check DB
    await db.execute(text("SELECT 1"))
    # Check Redis
    await redis.ping()
    return {"status": "healthy"}
```

## Scaling

- Backend: Stateless, scale horizontally via ECS
- Frontend: Edge-cached via CloudFront
- Database: RDS with read replicas if needed
- Redis: ElastiCache cluster mode for high availability
