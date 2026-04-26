import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.household import Household, HouseholdMember


class HouseholdRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, household_id: uuid.UUID, user_id: uuid.UUID) -> Household | None:
        """Get household only if user is owner or member."""
        stmt = (
            select(Household)
            .outerjoin(HouseholdMember, HouseholdMember.household_id == Household.id)
            .where(
                Household.id == household_id,
                (Household.owner_id == user_id) | (HouseholdMember.user_id == user_id),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[Household]:
        """List all households where user is owner or member."""
        stmt = (
            select(Household)
            .outerjoin(HouseholdMember, HouseholdMember.household_id == Household.id)
            .where(
                (Household.owner_id == user_id) | (HouseholdMember.user_id == user_id)
            )
            .distinct()
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, owner_id: uuid.UUID, name: str) -> Household:
        household = Household(owner_id=owner_id, name=name)
        self.session.add(household)
        await self.session.flush()
        # Auto-add owner as member
        member = HouseholdMember(
            household_id=household.id,
            user_id=owner_id,
            role="owner",
        )
        self.session.add(member)
        await self.session.flush()
        return household

    async def update(self, household: Household, **kwargs) -> Household:
        for key, value in kwargs.items():
            if hasattr(household, key) and value is not None:
                setattr(household, key, value)
        await self.session.flush()
        return household

    async def delete(self, household: Household) -> None:
        await self.session.delete(household)
        await self.session.flush()
