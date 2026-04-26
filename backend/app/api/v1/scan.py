from fastapi import APIRouter, Depends, UploadFile, File

from app.core.security import get_current_user
from app.core.dependencies import get_scan_service
from app.core.exceptions import ValidationError
from app.models.user import User
from app.schemas.scan import ScanResponse
from app.services.scan_service import ScanService

router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/photo", response_model=ScanResponse)
async def scan_appliance_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: ScanService = Depends(get_scan_service),
) -> ScanResponse:
    """Upload a photo of an appliance label and extract model information."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise ValidationError("File must be an image (JPEG, PNG)")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise ValidationError("Image must be under 10MB")

    return await service.scan_image(image_bytes)
