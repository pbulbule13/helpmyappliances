from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.households import router as households_router
from app.api.v1.devices import router as devices_router
from app.api.v1.scan import router as scan_router
from app.api.v1.troubleshoot import router as troubleshoot_router
from app.api.v1.documents import router as documents_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(households_router, prefix="/households", tags=["Households"])
router.include_router(devices_router, prefix="/devices", tags=["Devices"])
router.include_router(scan_router, prefix="/scan", tags=["Scan"])
router.include_router(troubleshoot_router, prefix="/troubleshoot", tags=["Troubleshooting"])
router.include_router(documents_router, prefix="/documents", tags=["Documents"])
