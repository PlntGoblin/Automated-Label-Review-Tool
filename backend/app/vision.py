"""Stage 1: Blind Extraction client.

Calls the vision model with the label image only — never the application
data — and returns a Pydantic-validated ExtractedLabel. The system prompt
is loaded from disk so the no-application-data property is auditable from
the file alone, without reading Python.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from pathlib import Path

import anthropic
from pydantic import ValidationError

from app import cache as extraction_cache
from app.config import settings
from app.schemas import ExtractedLabel

logger = logging.getLogger(__name__)


class VisionExtractionError(Exception):
    """Base class for vision-extraction failures."""


class MalformedExtractionError(VisionExtractionError):
    """Model returned successfully but its output could not be parsed or
    validated against the ExtractedLabel schema."""


class VisionAPIError(VisionExtractionError):
    """Model API failed after retry — network, 5xx, rate-limit exhaustion,
    auth failure, or missing API key."""


_PROMPT_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "docs"
    / "prompts"
    / "stage1_blind_extraction.txt"
)
_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*\n?|\n?```\s*$", re.MULTILINE)
_CLIENT: anthropic.AsyncAnthropic | None = None
_CLIENT_API_KEY: str | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    """Return a process-local Anthropic client so HTTP connections can be reused."""
    global _CLIENT, _CLIENT_API_KEY
    if _CLIENT is None or _CLIENT_API_KEY != settings.anthropic_api_key:
        _CLIENT = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        _CLIENT_API_KEY = settings.anthropic_api_key
    return _CLIENT


def _detect_media_type(image_bytes: bytes) -> str:
    """Infer image media type from leading magic bytes."""
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return "image/gif"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    if image_bytes[:4] == b"%PDF":
        return "application/pdf"
    raise MalformedExtractionError(
        "Unrecognized image format. Expected JPEG, PNG, GIF, WEBP, or PDF."
    )


def _strip_code_fences(text: str) -> str:
    """Remove ```json … ``` wrappers if the model added them despite instructions."""
    return _CODE_FENCE_RE.sub("", text).strip()


def _isolate_json_object(text: str) -> str:
    """Trim any leading/trailing prose so json.loads sees just the object body."""
    cleaned = _strip_code_fences(text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        return cleaned
    return cleaned[start : end + 1]


def _first_text_block(response: anthropic.types.Message) -> str:
    """Return the first text block's text, raising if none found."""
    for block in response.content:
        if block.type == "text":
            return block.text
    raise MalformedExtractionError("Model response contained no text blocks.")


async def _call_model(
    client: anthropic.AsyncAnthropic,
    media_type: str,
    image_b64: str,
) -> str:
    """One model call. Returns the raw response text."""
    # Thinking is disabled and effort is low because Stage 1 is a literal
    # extraction task with a strict prompt — adaptive thinking adds latency
    # (we have a sub-5s p95 target) without a measurable accuracy gain on
    # clean labels, and degraded labels are handled via the LOW_CONFIDENCE
    # literal rather than aggressive reasoning.
    # PDFs use the "document" content block; images use "image".
    content_type = "document" if media_type == "application/pdf" else "image"

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        system=[
            {
                "type": "text",
                "text": _PROMPT,
                # Cache the prompt so identical-prefix calls reuse it. Today
                # the prompt is below the per-model minimum (~2KB for Sonnet)
                # so this is a no-op; kept here so caching activates if the
                # prompt grows.
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": content_type,
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                ],
            },
        ],
    )
    return _first_text_block(response)


async def _call_with_retry(
    client: anthropic.AsyncAnthropic,
    media_type: str,
    image_b64: str,
) -> str:
    """One retry on transient errors with a 1s delay; otherwise surface as VisionAPIError."""
    transient = (
        anthropic.APIConnectionError,
        anthropic.RateLimitError,
        anthropic.InternalServerError,
    )
    try:
        return await _call_model(client, media_type, image_b64)
    except transient as first_err:
        logger.warning("vision transient error, retrying after 1s: %s", first_err)
        await asyncio.sleep(1)
        try:
            return await _call_model(client, media_type, image_b64)
        except transient as second_err:
            raise VisionAPIError(
                f"Model call failed after retry: {second_err}"
            ) from second_err
        except anthropic.APIStatusError as fatal:
            raise VisionAPIError(
                f"Non-retryable model error after retry: {fatal}"
            ) from fatal
    except anthropic.APIStatusError as fatal:
        raise VisionAPIError(f"Non-retryable model error: {fatal}") from fatal


async def extract(image_bytes: bytes) -> ExtractedLabel:
    """Run Blind Extraction on the label image and return a validated ExtractedLabel.

    Raises:
        MalformedExtractionError: model output could not be parsed or validated.
        VisionAPIError: model API failed (incl. missing API key).
    """
    if not settings.anthropic_api_key:
        raise VisionAPIError("ANTHROPIC_API_KEY is not set.")

    cached = extraction_cache.get(image_bytes)
    if cached is not None:
        return cached

    media_type = _detect_media_type(image_bytes)
    image_b64 = base64.standard_b64encode(image_bytes).decode("ascii")

    client = _get_client()
    raw_text = await _call_with_retry(client, media_type, image_b64)

    payload = _isolate_json_object(raw_text)
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as e:
        logger.warning("model returned non-JSON: %r", payload[:200])
        raise MalformedExtractionError(
            f"Model response was not valid JSON: {e}"
        ) from e

    try:
        result = ExtractedLabel.model_validate(data)
    except ValidationError as e:
        logger.warning("model JSON did not match ExtractedLabel: %s", e)
        raise MalformedExtractionError(
            f"Model JSON did not match ExtractedLabel schema: {e}"
        ) from e

    extraction_cache.set(image_bytes, result)
    return result
