import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_household(client: AsyncClient):
    response = await client.post("/api/v1/households/", json={"name": "My Home"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Home"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_households(client: AsyncClient):
    # Create a household first
    await client.post("/api/v1/households/", json={"name": "Test Home"})

    response = await client.get("/api/v1/households/")
    assert response.status_code == 200
    data = response.json()
    assert "households" in data
