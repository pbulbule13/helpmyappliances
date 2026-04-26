import pytest
from unittest.mock import AsyncMock, patch

from app.services.scan_service import ScanService


@pytest.fixture
def scan_service():
    return ScanService()


class TestScanService:
    @pytest.mark.asyncio
    async def test_scan_image_success(self, scan_service):
        mock_response = '{"model_number": "SHP878ZD5N", "brand": "Bosch", "category": "dishwasher", "confidence": 0.95, "raw_text": "Bosch SHP878ZD5N"}'

        with patch("app.services.scan_service.vision_extract", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = mock_response
            result = await scan_service.scan_image(b"fake_image_bytes")

        assert result.success is True
        assert result.result is not None
        assert result.result.model_number == "SHP878ZD5N"
        assert result.result.brand == "Bosch"
        assert result.result.confidence == 0.95

    @pytest.mark.asyncio
    async def test_scan_image_low_confidence(self, scan_service):
        mock_response = '{"model_number": "ABC123", "brand": "", "category": "other", "confidence": 0.3, "raw_text": "unclear"}'

        with patch("app.services.scan_service.vision_extract", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = mock_response
            result = await scan_service.scan_image(b"blurry_image")

        assert result.success is False
        assert result.error is not None
        assert "Low confidence" in result.error

    @pytest.mark.asyncio
    async def test_scan_image_api_failure(self, scan_service):
        with patch("app.services.scan_service.vision_extract", new_callable=AsyncMock) as mock_vision:
            mock_vision.side_effect = Exception("API error")
            result = await scan_service.scan_image(b"image_bytes")

        assert result.success is False
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_scan_image_json_in_markdown(self, scan_service):
        mock_response = '```json\n{"model_number": "WDT750SAHZ", "brand": "Whirlpool", "category": "dishwasher", "confidence": 0.88, "raw_text": "Whirlpool WDT750SAHZ"}\n```'

        with patch("app.services.scan_service.vision_extract", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = mock_response
            result = await scan_service.scan_image(b"image_bytes")

        assert result.success is True
        assert result.result.model_number == "WDT750SAHZ"

    def test_parse_response_valid_json(self, scan_service):
        result = scan_service._parse_response('{"model_number": "ABC"}')
        assert result == {"model_number": "ABC"}

    def test_parse_response_invalid_json(self, scan_service):
        result = scan_service._parse_response("not json at all")
        assert result is None

    def test_parse_response_json_in_code_block(self, scan_service):
        result = scan_service._parse_response('```json\n{"model_number": "XYZ"}\n```')
        assert result == {"model_number": "XYZ"}
