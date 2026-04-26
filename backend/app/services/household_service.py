"""Service for managing households."""

import uuid

import structlog

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.household import Household
from app.repositories.household_repository import HouseholdRepository
from app.schemas.household import HouseholdCreate, HouseholdUpdate

logger = structlog.get_logger()


class HouseholdService:
    def __init__(self, repo: HouseholdRepository):
        self.repo = repo

    async def create_household(self, user_id: uuid.UUID, data: HouseholdCreate) -> Household:
        household = await self.repo.create(owner_id=user_id, name=data.name)
        logger.info("household_created", household_id=str(household.id))
        return household

    async def get_household(self, household_id: uuid.UUID, user_id: uuid.UUID) -> Household:
        household = await self.repo.get_by_id(household_id, user_id)
        if not household:
            raise NotFoundError("Household")
        return household

    async def list_households(self, user_id: uuid.UUID) -> list[Household]:
        return await self.repo.list_by_user(user_id)

    async def update_household(
        self, household_id: uuid.UUID, user_id: uuid.UUID, data: HouseholdUpdate
    ) -> Household:
        household = await self.get_household(household_id, user_id)
        if household.owner_id != user_id:
            raise PermissionDeniedError("Only the owner can update the household")
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(household, **update_data)

    async def delete_household(self, household_id: uuid.UUID, user_id: uuid.UUID) -> None:
        household = await self.get_household(household_id, user_id)
        if household.owner_id != user_id:
            raise PermissionDeniedError("Only the owner can delete the household")
        await self.repo.delete(household)
        logger.info("household_deleted", household_id=str(household_id))
