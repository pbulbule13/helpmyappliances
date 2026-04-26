import asyncio
import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.main import app
from app.models.user import User


# Use SQLite for tests (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    # Exclude device_documents table (uses pgvector Vector type not supported in SQLite)
    tables_to_create = [
        t for t in Base.metadata.sorted_tables
        if t.name != "device_documents"
    ]

    async with engine.begin() as conn:
        for table in tables_to_create:
            await conn.run_sync(table.create)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        for table in reversed(tables_to_create):
            await conn.run_sync(table.drop)
    await engine.dispose()


@pytest.fixture
def mock_user() -> User:
    return User(
        id=uuid.uuid4(),
        firebase_uid="test_uid_123",
        email="test@example.com",
        display_name="Test User",
        avatar_url="",
        subscription_tier="free",
    )


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, mock_user: User) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client with mocked auth and DB."""

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
