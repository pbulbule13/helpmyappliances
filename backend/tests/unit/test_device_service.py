import uuid

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.exceptions import NotFoundError
from app.services.device_service import DeviceService
from app.schemas.device import DeviceCreate, DeviceUpdate
from app.models.device import Device


@pytest.fixture
def device_repo():
    return AsyncMock()


@pytest.fixture
def doc_repo():
    return AsyncMock()


@pytest.fixture
def device_service(device_repo, doc_repo):
    return DeviceService(device_repo, doc_repo)


@pytest.fixture
def sample_device():
    return Device(
        id=uuid.uuid4(),
        household_id=uuid.uuid4(),
        created_by=uuid.uuid4(),
        brand="Bosch",
        model_number="SHP878ZD5N",
        category="dishwasher",
        nickname="Kitchen Dishwasher",
        room="Kitchen",
    )


class TestDeviceService:
    @pytest.mark.asyncio
    async def test_create_device(self, device_service, device_repo, sample_device):
        device_repo.create.return_value = sample_device
        household_id = uuid.uuid4()
        user_id = uuid.uuid4()

        data = DeviceCreate(
            household_id=household_id,
            brand="Bosch",
            model_number="SHP878ZD5N",
            category="dishwasher",
        )

        result = await device_service.create_device(user_id, data)
        assert result.model_number == "SHP878ZD5N"
        device_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_device_not_found(self, device_service, device_repo):
        device_repo.get_by_id.return_value = None
        user_id = uuid.uuid4()
        device_id = uuid.uuid4()

        with pytest.raises(NotFoundError):
            await device_service.get_device(device_id, user_id)

    @pytest.mark.asyncio
    async def test_get_device_success(self, device_service, device_repo, sample_device):
        device_repo.get_by_id.return_value = sample_device
        user_id = uuid.uuid4()

        result = await device_service.get_device(sample_device.id, user_id)
        assert result.brand == "Bosch"

    @pytest.mark.asyncio
    async def test_list_devices(self, device_service, device_repo, sample_device):
        device_repo.list_by_user.return_value = ([sample_device], 1)
        user_id = uuid.uuid4()

        devices, total = await device_service.list_devices(user_id)
        assert total == 1
        assert len(devices) == 1

    @pytest.mark.asyncio
    async def test_delete_device(self, device_service, device_repo, sample_device):
        device_repo.get_by_id.return_value = sample_device
        device_repo.delete.return_value = None
        user_id = uuid.uuid4()

        await device_service.delete_device(sample_device.id, user_id)
        device_repo.delete.assert_called_once_with(sample_device)
