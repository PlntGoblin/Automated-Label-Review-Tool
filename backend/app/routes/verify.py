"""POST /api/verify — single-label verification.

Stage 1 (vision) extracts label fields; Stage 2 (verification.verify_label)
runs deterministic per-field comparison against application data. On any
vision failure (malformed JSON, persistent API error, invalid base64),
the response carries `manual_review_required: true` with status 200 — the
agent sees the failure and reviews manually.
"""

import base64
import binascii
import logging

from fastapi import APIRouter, HTTPException

from app import vision
from app.canonical import CANONICAL_WARNING_TEXT
from app.schemas import (
    ApplicationData,
    ExtractedLabel,
    VerificationResult,
    VerificationSummary,
    VerifyRequest,
    WarningExtraction,
    WarningResult,
)
from app.verification import verify_label
from app.vision import MalformedExtractionError, VisionAPIError

logger = logging.getLogger(__name__)
router = APIRouter()

_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

# Magic-byte prefixes for accepted file types.
_VALID_MAGIC: tuple[bytes, ...] = (
    b"\xff\xd8\xff",        # JPEG
    b"\x89PNG\r\n\x1a\n",   # PNG
    b"%PDF",                 # PDF
)


def _validate_image_bytes(image_bytes: bytes) -> str | None:
    """Return an error message if file fails size/type checks, or None if OK."""
    if len(image_bytes) > _MAX_IMAGE_BYTES:
        return f"Image exceeds 10 MB limit ({len(image_bytes):,} bytes)."
    if not any(image_bytes.startswith(magic) for magic in _VALID_MAGIC):
        return "Unsupported file type. Accepted: JPEG, PNG, PDF."
    return None


def _empty_extraction() -> ExtractedLabel:
    """All-null ExtractedLabel for the manual-review path."""
    return ExtractedLabel(
        brand_name=None,
        class_or_type=None,
        alcohol_content=None,
        net_contents=None,
        bottler_name_and_address=None,
        country_of_origin=None,
        government_warning=WarningExtraction(
            verbatim_text=None,
            is_all_caps=None,
            is_bold=None,
            is_continuous_paragraph=None,
            bbox=None,
        ),
        bboxes={},
    )


def _manual_review_result(
    application: ApplicationData, error_reason: str
) -> VerificationResult:
    """VerificationResult that surfaces an extraction failure to the agent."""
    return VerificationResult(
        extracted=_empty_extraction(),
        fields={},
        government_warning=WarningResult(
            status="LOW_CONFIDENCE",
            extracted_text=None,
            canonical_text=CANONICAL_WARNING_TEXT,
            is_all_caps=None,
            is_bold=None,
            is_continuous_paragraph=None,
            region_crop=None,
        ),
        summary=VerificationSummary(
            pass_count=0,
            flag_count=0,
            low_confidence_count=0,
            requires_full_manual_review=True,
        ),
        manual_review_required=True,
        error_reason=error_reason,
    )


async def run_single_verification(request: VerifyRequest) -> VerificationResult:
    """Full single-label verification pipeline. Shared by /verify and /verify/batch."""
    try:
        image_bytes = base64.b64decode(request.label_image, validate=True)
    except binascii.Error as e:
        logger.warning("invalid base64 label_image: %s", e)
        return _manual_review_result(
            request.application, f"Invalid base64 image: {e}"
        )

    validation_error = _validate_image_bytes(image_bytes)
    if validation_error:
        logger.warning("image validation failed: %s", validation_error)
        return _manual_review_result(request.application, validation_error)

    try:
        extracted = await vision.extract(image_bytes)
    except MalformedExtractionError as e:
        logger.warning("malformed extraction: %s", e)
        return _manual_review_result(
            request.application, f"Vision extraction malformed: {e}"
        )
    except VisionAPIError as e:
        logger.error("vision API failed: %s", e)
        return _manual_review_result(
            request.application, f"Vision API failed: {e}"
        )

    return verify_label(extracted, request.application, image_bytes)


@router.post("/verify", response_model=VerificationResult)
async def verify(request: VerifyRequest) -> VerificationResult:
    """Verify a single label image against its application data."""
    # Single endpoint: reject clearly invalid input with 422 before processing.
    try:
        raw = base64.b64decode(request.label_image, validate=True)
    except binascii.Error:
        pass  # run_single_verification handles base64 failures as manual_review
    else:
        error = _validate_image_bytes(raw)
        if error:
            raise HTTPException(status_code=422, detail=error)
    return await run_single_verification(request)
