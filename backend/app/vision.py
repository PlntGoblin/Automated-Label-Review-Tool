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
from google import genai as google_genai
from google.genai import types as google_types
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

# ── Anthropic client ──────────────────────────────────────────────────────────
_CLIENT: anthropic.AsyncAnthropic | None = None
_CLIENT_API_KEY: str | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    """Return a process-local Anthropic client so HTTP connections can be reused."""
    global _CLIENT, _CLIENT_API_KEY
    if _CLIENT is None or _CLIENT_API_KEY != settings.anthropic_api_key:
        _CLIENT = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        _CLIENT_API_KEY = settings.anthropic_api_key
    return _CLIENT


# ── Gemini client ─────────────────────────────────────────────────────────────
_GEMINI_CLIENT: google_genai.Client | None = None
_GEMINI_API_KEY: str | None = None


def _get_gemini_client() -> google_genai.Client:
    global _GEMINI_CLIENT, _GEMINI_API_KEY
    if _GEMINI_CLIENT is None or _GEMINI_API_KEY != settings.gemini_api_key:
        _GEMINI_CLIENT = google_genai.Client(api_key=settings.gemini_api_key)
        _GEMINI_API_KEY = settings.gemini_api_key
    return _GEMINI_CLIENT


async def _call_model_gemini(images: list[tuple[str, str]]) -> str:
    """Call Gemini with one or more label images. Returns raw response text."""
    client = _get_gemini_client()
    parts: list[google_types.Part] = []
    for media_type, image_b64 in images:
        image_bytes = base64.standard_b64decode(image_b64)
        parts.append(google_types.Part.from_bytes(data=image_bytes, mime_type=media_type))
    parts.append(google_types.Part.from_text(text=_PROMPT))

    response = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=parts,
        config=google_types.GenerateContentConfig(
            thinking_config=google_types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return response.text


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
    images: list[tuple[str, str]],
) -> str:
    """One model call. Returns the raw response text.

    images: list of (media_type, image_b64) pairs — supports multi-image
    labels (e.g. front + back of a bottle) sent in a single API call.
    """
    content = []
    for media_type, image_b64 in images:
        content_type = "document" if media_type == "application/pdf" else "image"
        content.append({
            "type": content_type,
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_b64,
            },
        })

    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        system=[
            {
                "type": "text",
                "text": _PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": content}],
    )
    return _first_text_block(response)


async def _call_with_retry(
    client: anthropic.AsyncAnthropic,
    images: list[tuple[str, str]],
) -> str:
    """One retry on transient errors with a 1s delay; otherwise surface as VisionAPIError."""
    transient = (
        anthropic.APIConnectionError,
        anthropic.RateLimitError,
        anthropic.InternalServerError,
    )
    try:
        return await _call_model(client, images)
    except transient as first_err:
        logger.warning("vision transient error, retrying after 1s: %s", first_err)
        await asyncio.sleep(1)
        try:
            return await _call_model(client, images)
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


async def extract_warning_text(image_bytes: bytes) -> str | None:
    """Targeted extraction of just the government warning text from a pre-cropped image.

    Used as a fallback when the main extraction produces a low-quality warning read
    (e.g. rotated label). Returns the verbatim text string, or None on failure.
    """
    if not settings.anthropic_api_key:
        return None
    try:
        media_type = _detect_media_type(image_bytes)
        image_b64 = base64.standard_b64encode(image_bytes).decode("ascii")
        client = _get_client()
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=400,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image" if media_type != "application/pdf" else "document",
                            "source": {"type": "base64", "media_type": media_type, "data": image_b64},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Read the government warning text in this image exactly as printed. "
                                "Return only the verbatim text, nothing else. "
                                "If the text is unreadable, return the single word: UNREADABLE"
                            ),
                        },
                    ],
                }
            ],
        )
        text = _first_text_block(response).strip()
        return None if text == "UNREADABLE" else text
    except Exception:
        logger.warning("extract_warning_text failed", exc_info=True)
        return None


async def extract(images_bytes: list[bytes]) -> ExtractedLabel:
    """Run Blind Extraction on one or more label images and return a validated ExtractedLabel.

    Multiple images (e.g. front + back of a bottle) are sent together in a
    single API call so the model can read all fields across the full label set.

    Raises:
        MalformedExtractionError: model output could not be parsed or validated.
        VisionAPIError: model API failed (incl. missing API key).
    """
    provider = settings.vision_provider.lower()

    if provider != "gemini" and not settings.anthropic_api_key:
        raise VisionAPIError("ANTHROPIC_API_KEY is not set.")

    cache_key = b"\x00".join(images_bytes)
    cached = extraction_cache.get(cache_key)
    if cached is not None:
        return cached

    images = [
        (_detect_media_type(b), base64.standard_b64encode(b).decode("ascii"))
        for b in images_bytes
    ]

    if provider == "gemini" and settings.gemini_api_key:
        try:
            logger.info("vision provider: gemini (%s)", settings.gemini_model)
            raw_text = await _call_model_gemini(images)
        except Exception as gemini_err:
            logger.warning("gemini failed (%s), falling back to claude", gemini_err)
            if not settings.anthropic_api_key:
                raise VisionAPIError("Gemini failed and ANTHROPIC_API_KEY is not set for fallback.") from gemini_err
            logger.info("vision fallback: claude (%s)", settings.anthropic_model)
            client = _get_client()
            raw_text = await _call_with_retry(client, images)
    else:
        logger.info("vision provider: claude (%s)", settings.anthropic_model)
        client = _get_client()
        raw_text = await _call_with_retry(client, images)

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

    extraction_cache.set(cache_key, result)
    return result
