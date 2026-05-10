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

from fastapi import APIRouter

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

    return verify_label(extracted, request.application)


@router.post("/verify", response_model=VerificationResult)
async def verify(request: VerifyRequest) -> VerificationResult:
    """Verify a single label image against its application data."""
    return await run_single_verification(request)
