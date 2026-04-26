"""Service for scanning appliance model number plates via AI vision."""

import json
import re

import structlog

from app.schemas.scan import ScanResult, ScanResponse
from app.services.euri_client import vision_extract

logger = structlog.get_logger()

SCAN_PROMPT = """Analyze this image of an appliance label/plate. Extract the following information:

1. Model number (the primary alphanumeric identifier)
2. Brand/manufacturer name
3. Serial number (if visible)
4. Type of appliance (dishwasher, washer, dryer, refrigerator, oven, microwave, hvac, or other)

Respond in this exact JSON format:
{
    "model_number": "extracted model number or empty string",
    "brand": "brand name or empty string",
    "serial_number": "serial number or empty string",
    "category": "appliance type",
    "confidence": 0.95,
    "raw_text": "all visible text on the label"
}

If the image is unclear or you cannot read the label, set confidence below 0.5.
If you see multiple possible model numbers, return the most prominent one.
Be precise — model numbers are typically alphanumeric with dashes (e.g., SHP878ZD5N, WDT750SAHZ)."""


class ScanService:
    async def scan_image(self, image_bytes: bytes) -> ScanResponse:
        """Extract model number and appliance info from a photo."""
        try:
            raw_response = await vision_extract(image_bytes, SCAN_PROMPT)
            logger.info("scan_completed", response_length=len(raw_response))

            parsed = self._parse_response(raw_response)
            if not parsed:
                return ScanResponse(
                    success=False,
                    error="Could not parse the image. Please try again with a clearer photo.",
                )

            result = ScanResult(
                model_number=parsed.get("model_number", ""),
                brand=parsed.get("brand", ""),
                confidence=float(parsed.get("confidence", 0)),
                raw_text=parsed.get("raw_text", ""),
                suggested_category=parsed.get("category", "other"),
            )

            if result.confidence < 0.5 or not result.model_number:
                return ScanResponse(
                    success=False,
                    error="Low confidence reading. Please retake the photo or enter the model number manually.",
                    candidates=[result] if result.model_number else [],
                )

            return ScanResponse(success=True, result=result)

        except Exception as e:
            logger.error("scan_failed", error=str(e))
            return ScanResponse(
                success=False,
                error="Failed to process the image. Please try again.",
            )

    def _parse_response(self, response: str) -> dict | None:
        """Parse the AI response JSON."""
        try:
            # Try direct JSON parse
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON from markdown code block
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try finding any JSON object
        json_match = re.search(r"\{[^{}]*\}", response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        return None
