"""EURI API client — OpenAI-compatible gateway for AI capabilities."""

import base64
from collections.abc import AsyncGenerator

import structlog
from openai import AsyncOpenAI

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# EURI uses OpenAI-compatible API
client = AsyncOpenAI(
    api_key=settings.euri_api_key,
    base_url=settings.euri_api_base_url,
)


async def vision_extract(image_bytes: bytes, prompt: str) -> str:
    """Use Gemini vision via EURI to analyze an image."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = await client.chat.completions.create(
        model="gemini-2.5-flash",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"},
                    },
                ],
            }
        ],
        max_tokens=1000,
    )
    return response.choices[0].message.content


async def chat_completion(
    messages: list[dict], model: str = "gemini-2.5-flash"
) -> str:
    """Non-streaming chat completion."""
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=2000,
    )
    return response.choices[0].message.content


async def chat_completion_stream(
    messages: list[dict], model: str = "gemini-2.5-flash"
) -> AsyncGenerator[str, None]:
    """Streaming chat completion for SSE."""
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=2000,
        stream=True,
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding vector for text."""
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding
