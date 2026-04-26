from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.household_repository import HouseholdRepository
from app.repositories.device_repository import DeviceRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.document_repository import DocumentRepository
from app.services.device_service import DeviceService
from app.services.household_service import HouseholdService
from app.services.scan_service import ScanService
from app.services.troubleshoot_service import TroubleshootService
from app.services.document_search_service import DocumentSearchService


def get_user_repo(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_household_repo(db: AsyncSession = Depends(get_db)) -> HouseholdRepository:
    return HouseholdRepository(db)


def get_device_repo(db: AsyncSession = Depends(get_db)) -> DeviceRepository:
    return DeviceRepository(db)


def get_session_repo(db: AsyncSession = Depends(get_db)) -> SessionRepository:
    return SessionRepository(db)


def get_document_repo(db: AsyncSession = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(db)


def get_household_service(
    repo: HouseholdRepository = Depends(get_household_repo),
) -> HouseholdService:
    return HouseholdService(repo)


def get_device_service(
    repo: DeviceRepository = Depends(get_device_repo),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> DeviceService:
    return DeviceService(repo, doc_repo)


def get_scan_service() -> ScanService:
    return ScanService()


def get_troubleshoot_service(
    session_repo: SessionRepository = Depends(get_session_repo),
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> TroubleshootService:
    return TroubleshootService(session_repo, doc_repo)


def get_document_search_service(
    doc_repo: DocumentRepository = Depends(get_document_repo),
) -> DocumentSearchService:
    return DocumentSearchService(doc_repo)
