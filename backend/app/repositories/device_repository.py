import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.device import Device
from app.models.household import Household, HouseholdMember


class DeviceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _user_household_ids(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        """Get all household IDs a user belongs to."""
        stmt = (
            select(Household.id)
            .outerjoin(HouseholdMember, HouseholdMember.household_id == Household.id)
            .where(
                (Household.owner_id == user_id) | (HouseholdMember.user_id == user_id)
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, device_id: uuid.UUID, user_id: uuid.UUID) -> Device | None:
        """Get device only if user has access via household membership."""
        household_ids = await self._user_household_ids(user_id)
        if not household_ids:
            return None
        stmt = (
            select(Device)
            .where(Device.id == device_id, Device.household_id.in_(household_ids))
            .options(selectinload(Device.documents))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: uuid.UUID, household_id: uuid.UUID | None = None
    ) -> tuple[list[Device], int]:
        """List devices the user has access to, optionally filtered by household."""
        household_ids = await self._user_household_ids(user_id)
        if not household_ids:
            return [], 0

        if household_id and household_id in household_ids:
            filter_ids = [household_id]
        else:
            filter_ids = household_ids

        stmt = select(Device).where(Device.household_id.in_(filter_ids)).order_by(Device.created_at.desc())
        count_stmt = select(func.count()).select_from(Device).where(Device.household_id.in_(filter_ids))

        result = await self.session.execute(stmt)
        count_result = await self.session.execute(count_stmt)

        return list(result.scalars().all()), count_result.scalar_one()

    async def create(self, user_id: uuid.UUID, **kwargs) -> Device:
        device = Device(created_by=user_id, **kwargs)
        self.session.add(device)
        await self.session.flush()
        return device

    async def update(self, device: Device, **kwargs) -> Device:
        for key, value in kwargs.items():
            if hasattr(device, key) and value is not None:
                setattr(device, key, value)
        await self.session.flush()
        return device

    async def delete(self, device: Device) -> None:
        await self.session.delete(device)
        await self.session.flush()
