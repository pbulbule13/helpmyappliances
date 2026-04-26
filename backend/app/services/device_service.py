"""Service for managing device profiles."""

import uuid

import structlog

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.device import Device
from app.repositories.device_repository import DeviceRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas.device import DeviceCreate, DeviceUpdate

logger = structlog.get_logger()


class DeviceService:
    def __init__(self, repo: DeviceRepository, doc_repo: DocumentRepository):
        self.repo = repo
        self.doc_repo = doc_repo

    async def create_device(self, user_id: uuid.UUID, data: DeviceCreate) -> Device:
        device = await self.repo.create(
            user_id=user_id,
            household_id=data.household_id,
            brand=data.brand,
            model_number=data.model_number,
            serial_number=data.serial_number,
            category=data.category,
            nickname=data.nickname,
            room=data.room,
            purchase_date=data.purchase_date,
        )
        logger.info("device_created", device_id=str(device.id), model=data.model_number)
        return device

    async def get_device(self, device_id: uuid.UUID, user_id: uuid.UUID) -> Device:
        device = await self.repo.get_by_id(device_id, user_id)
        if not device:
            raise NotFoundError("Device")
        return device

    async def list_devices(
        self, user_id: uuid.UUID, household_id: uuid.UUID | None = None
    ) -> tuple[list[Device], int]:
        return await self.repo.list_by_user(user_id, household_id)

    async def update_device(
        self, device_id: uuid.UUID, user_id: uuid.UUID, data: DeviceUpdate
    ) -> Device:
        device = await self.get_device(device_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        device = await self.repo.update(device, **update_data)
        logger.info("device_updated", device_id=str(device_id))
        return device

    async def delete_device(self, device_id: uuid.UUID, user_id: uuid.UUID) -> None:
        device = await self.get_device(device_id, user_id)
        await self.repo.delete(device)
        logger.info("device_deleted", device_id=str(device_id))
