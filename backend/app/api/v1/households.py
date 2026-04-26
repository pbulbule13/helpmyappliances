import uuid

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.core.dependencies import get_household_service
from app.models.user import User
from app.schemas.household import (
    HouseholdCreate,
    HouseholdUpdate,
    HouseholdResponse,
    HouseholdListResponse,
)
from app.services.household_service import HouseholdService

router = APIRouter()


@router.get("/", response_model=HouseholdListResponse)
async def list_households(
    current_user: User = Depends(get_current_user),
    service: HouseholdService = Depends(get_household_service),
) -> HouseholdListResponse:
    households = await service.list_households(current_user.id)
    return HouseholdListResponse(
        households=[HouseholdResponse.model_validate(h) for h in households]
    )


@router.post("/", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    data: HouseholdCreate,
    current_user: User = Depends(get_current_user),
    service: HouseholdService = Depends(get_household_service),
) -> HouseholdResponse:
    household = await service.create_household(current_user.id, data)
    return HouseholdResponse.model_validate(household)


@router.get("/{household_id}", response_model=HouseholdResponse)
async def get_household(
    household_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: HouseholdService = Depends(get_household_service),
) -> HouseholdResponse:
    household = await service.get_household(household_id, current_user.id)
    return HouseholdResponse.model_validate(household)


@router.put("/{household_id}", response_model=HouseholdResponse)
async def update_household(
    household_id: uuid.UUID,
    data: HouseholdUpdate,
    current_user: User = Depends(get_current_user),
    service: HouseholdService = Depends(get_household_service),
) -> HouseholdResponse:
    household = await service.update_household(household_id, current_user.id, data)
    return HouseholdResponse.model_validate(household)


@router.delete("/{household_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_household(
    household_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: HouseholdService = Depends(get_household_service),
) -> None:
    await service.delete_household(household_id, current_user.id)
