from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application error."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} not found",
            status_code=404,
        )


class PermissionDeniedError(AppError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            code="PERMISSION_DENIED",
            message=message,
            status_code=403,
        )


class RateLimitError(AppError):
    def __init__(self):
        super().__init__(
            code="RATE_LIMIT_EXCEEDED",
            message="Rate limit exceeded. Please upgrade to premium for unlimited access.",
            status_code=429,
        )


class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=422,
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )
