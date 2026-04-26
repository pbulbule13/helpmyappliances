from pydantic import BaseModel


class ScanResult(BaseModel):
    model_number: str
    brand: str
    confidence: float
    raw_text: str
    suggested_category: str


class ScanResponse(BaseModel):
    success: bool
    result: ScanResult | None = None
    error: str | None = None
    candidates: list[ScanResult] = []
