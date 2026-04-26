import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.repositories.user_repository import UserRepository

logger = structlog.get_logger()
security_scheme = HTTPBearer()
settings = get_settings()


async def _resolve_dev_token(token: str, user_repo: UserRepository):
    """Dev-mode auth: token is 'dev:{email}'. No Firebase required."""
    email = token[4:]  # strip 'dev:'
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Invalid dev token"}},
        )
    uid = f"dev_{email.replace('@', '_').replace('.', '_')}"
    user = await user_repo.get_by_firebase_uid(uid)
    if not user:
        user = await user_repo.create_from_firebase(
            firebase_uid=uid,
            email=email,
            display_name=email.split("@")[0],
            avatar_url="",
        )
    return user


async def verify_firebase_token(token: str) -> dict:
    """Verify Firebase ID token and return decoded claims."""
    try:
        decoded_token = id_token.verify_firebase_token(
            token,
            google_requests.Request(),
            audience=settings.firebase_project_id,
        )
        return decoded_token
    except Exception as e:
        logger.warning("firebase_token_verification_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Invalid or expired token"}},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Extract and verify the current user from the bearer token.

    In dev mode (DEV_AUTH=true), accepts 'dev:{email}' tokens so Firebase
    is not required for local development.
    """
    token = credentials.credentials
    user_repo = UserRepository(db)

    if settings.dev_auth and token.startswith("dev:"):
        return await _resolve_dev_token(token, user_repo)

    token_data = await verify_firebase_token(token)
    user = await user_repo.get_by_firebase_uid(token_data["sub"])
    if not user:
        user = await user_repo.create_from_firebase(
            firebase_uid=token_data["sub"],
            email=token_data.get("email", ""),
            display_name=token_data.get("name", ""),
            avatar_url=token_data.get("picture", ""),
        )
    return user
