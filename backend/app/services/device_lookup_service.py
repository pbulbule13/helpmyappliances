"""Service for looking up appliance documentation from external sources."""

import uuid

import aiohttp
import structlog

from app.core.config import get_settings
from app.repositories.document_repository import DocumentRepository
from app.services.euri_client import generate_embedding

logger = structlog.get_logger()
settings = get_settings()


class DeviceLookupService:
    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def lookup_and_store(
        self, device_id: uuid.UUID, model_number: str, brand: str = ""
    ) -> list[dict]:
        """Look up documentation for an appliance and store results."""
        results = []

        # Run lookups concurrently
        energy_star = await self._search_energy_star(model_number, brand)
        recalls = await self._search_cpsc_recalls(model_number, brand)
        videos = await self._search_youtube(model_number, brand)

        all_docs = energy_star + recalls + videos

        # Store documents
        for doc_data in all_docs:
            doc_data["device_id"] = device_id
            # Generate embedding for extracted text if available
            if doc_data.get("extracted_text"):
                try:
                    embedding = await generate_embedding(doc_data["extracted_text"][:2000])
                    doc_data["embedding"] = embedding
                except Exception as e:
                    logger.warning("embedding_generation_failed", error=str(e))

        if all_docs:
            await self.doc_repo.bulk_create(all_docs)

        logger.info(
            "device_lookup_completed",
            model_number=model_number,
            docs_found=len(all_docs),
        )
        return all_docs

    async def _search_energy_star(self, model_number: str, brand: str) -> list[dict]:
        """Search Energy Star API for appliance specifications."""
        docs = []
        try:
            url = "https://data.energystar.gov/resource/h5zs-2gkb.json"
            params = {"$where": f"model_number LIKE '%{model_number}%'", "$limit": 5}
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for item in data:
                            docs.append({
                                "doc_type": "spec_sheet",
                                "title": f"Energy Star - {item.get('model_number', model_number)}",
                                "source_url": f"https://www.energystar.gov/productfinder/product/certified-residential-dishwashers/details/{item.get('pd_id', '')}",
                                "extracted_text": str(item),
                            })
        except Exception as e:
            logger.warning("energy_star_search_failed", error=str(e))
        return docs

    async def _search_cpsc_recalls(self, model_number: str, brand: str) -> list[dict]:
        """Search CPSC for product recalls."""
        docs = []
        try:
            search_term = f"{brand} {model_number}".strip()
            url = "https://www.saferproducts.gov/RestWebServices/Recall"
            params = {"format": "json", "ProductName": search_term}
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for recall in data[:5]:
                            title = recall.get("Title", "Product Recall")
                            desc = recall.get("Description", "")
                            docs.append({
                                "doc_type": "recall_notice",
                                "title": title,
                                "source_url": recall.get("URL", "https://www.cpsc.gov/Recalls"),
                                "extracted_text": f"{title}\n{desc}",
                            })
        except Exception as e:
            logger.warning("cpsc_search_failed", error=str(e))
        return docs

    async def _search_youtube(self, model_number: str, brand: str) -> list[dict]:
        """Search YouTube for repair videos."""
        docs = []
        if not settings.youtube_api_key:
            return docs

        try:
            search_term = f"{brand} {model_number} repair troubleshoot"
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": search_term,
                "type": "video",
                "maxResults": 5,
                "key": settings.youtube_api_key,
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for item in data.get("items", []):
                            snippet = item.get("snippet", {})
                            video_id = item.get("id", {}).get("videoId", "")
                            docs.append({
                                "doc_type": "video",
                                "title": snippet.get("title", "Repair Video"),
                                "source_url": f"https://www.youtube.com/watch?v={video_id}",
                                "extracted_text": snippet.get("description", ""),
                            })
        except Exception as e:
            logger.warning("youtube_search_failed", error=str(e))
        return docs
