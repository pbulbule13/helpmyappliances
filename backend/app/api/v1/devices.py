import uuid

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.core.dependencies import get_device_service
from app.models.user import User
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    DeviceListResponse,
)
from app.services.device_service import DeviceService

router = APIRouter()


@router.get("/", response_model=DeviceListResponse)
async def list_devices(
    household_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
) -> DeviceListResponse:
    devices, total = await service.list_devices(current_user.id, household_id)
    return DeviceListResponse(
        devices=[DeviceResponse.model_validate(d) for d in devices],
        total=total,
    )


@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    data: DeviceCreate,
    current_user: User = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
) -> DeviceResponse:
    device = await service.create_device(current_user.id, data)
    return DeviceResponse.model_validate(device)


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
) -> DeviceResponse:
    device = await service.get_device(device_id, current_user.id)
    return DeviceResponse.model_validate(device)


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: uuid.UUID,
    data: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
) -> DeviceResponse:
    device = await service.update_device(device_id, current_user.id, data)
    return DeviceResponse.model_validate(device)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: DeviceService = Depends(get_device_service),
) -> None:
    await service.delete_device(device_id, current_user.id)
