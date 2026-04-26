from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.post("/verify", response_model=UserResponse)
async def verify_token(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Verify Firebase token and return user profile. Creates user on first login."""
    return UserResponse.model_validate(current_user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)
