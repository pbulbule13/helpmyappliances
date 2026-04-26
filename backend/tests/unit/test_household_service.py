import uuid

import pytest
from unittest.mock import AsyncMock

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.services.household_service import HouseholdService
from app.schemas.household import HouseholdCreate, HouseholdUpdate
from app.models.household import Household


@pytest.fixture
def repo():
    return AsyncMock()


@pytest.fixture
def service(repo):
    return HouseholdService(repo)


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.fixture
def sample_household(user_id):
    return Household(id=uuid.uuid4(), owner_id=user_id, name="My Home")


class TestHouseholdService:
    @pytest.mark.asyncio
    async def test_create_household(self, service, repo, user_id, sample_household):
        repo.create.return_value = sample_household
        data = HouseholdCreate(name="My Home")

        result = await service.create_household(user_id, data)
        assert result.name == "My Home"
        repo.create.assert_called_once_with(owner_id=user_id, name="My Home")

    @pytest.mark.asyncio
    async def test_get_household_not_found(self, service, repo, user_id):
        repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            await service.get_household(uuid.uuid4(), user_id)

    @pytest.mark.asyncio
    async def test_list_households(self, service, repo, user_id, sample_household):
        repo.list_by_user.return_value = [sample_household]

        result = await service.list_households(user_id)
        assert len(result) == 1
        assert result[0].name == "My Home"

    @pytest.mark.asyncio
    async def test_update_household_not_owner(self, service, repo, sample_household):
        other_user = uuid.uuid4()
        repo.get_by_id.return_value = sample_household
        data = HouseholdUpdate(name="New Name")

        with pytest.raises(PermissionDeniedError):
            await service.update_household(sample_household.id, other_user, data)

    @pytest.mark.asyncio
    async def test_delete_household_not_owner(self, service, repo, sample_household):
        other_user = uuid.uuid4()
        repo.get_by_id.return_value = sample_household

        with pytest.raises(PermissionDeniedError):
            await service.delete_household(sample_household.id, other_user)
