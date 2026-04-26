import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_device(client: AsyncClient):
    # First create a household
    household_resp = await client.post("/api/v1/households/", json={"name": "My Home"})
    household_id = household_resp.json()["id"]

    response = await client.post("/api/v1/devices/", json={
        "household_id": household_id,
        "model_number": "SHP878ZD5N",
        "brand": "Bosch",
        "category": "dishwasher",
        "nickname": "Kitchen Dishwasher",
        "room": "Kitchen",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["model_number"] == "SHP878ZD5N"
    assert data["brand"] == "Bosch"


@pytest.mark.asyncio
async def test_list_devices(client: AsyncClient):
    response = await client.get("/api/v1/devices/")
    assert response.status_code == 200
    data = response.json()
    assert "devices" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_device_not_found(client: AsyncClient):
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/v1/devices/{fake_id}")
    assert response.status_code == 404
