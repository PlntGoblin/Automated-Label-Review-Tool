"""POST /api/verify — single-label verification.

Stage 1 (vision) is wired in real. Stage 2 (deterministic compare) is a
passthrough that surfaces the real extraction with placeholder field
statuses; Phase 3 replaces it with the real per-field compare. On any
vision failure (malformed JSON, persistent API error, invalid base64),
the response carries `manual_review_required: true` with status 200 — the
agent sees the failure and reviews manually.
"""

import base64
import binascii
import logging

from fastapi import APIRouter

from app import vision
from app.schemas import (
    ApplicationData,
    ExtractedLabel,
    FieldResult,
    FieldStatus,
    VerificationResult,
    VerificationSummary,
    VerifyRequest,
    WarningExtraction,
    WarningResult,
)
from app.vision import MalformedExtractionError, VisionAPIError

logger = logging.getLogger(__name__)
router = APIRouter()

# 27 CFR § 16.21(a) — canonical Government Warning text. Phase 3 lifts this
# constant into app/canonical.py for shared use across verification modules.
_CANONICAL_WARNING = (
    "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not "
    "drink alcoholic beverages during pregnancy because of the risk of birth "
    "defects. (2) Consumption of alcoholic beverages impairs your ability to "
    "drive a car or operate machinery, and may cause health problems."
)

_FIELD_NAMES: tuple[str, ...] = (
    "brand_name",
    "class_or_type",
    "alcohol_content",
    "net_contents",
    "bottler_name_and_address",
    "country_of_origin",
)


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
            canonical_text=_CANONICAL_WARNING,
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


def _stage2_passthrough(
    extracted: ExtractedLabel, application: ApplicationData
) -> VerificationResult:
    """Phase 2 placeholder: surface the real extraction with mock-derived statuses.

    Statuses come only from extraction outcome — `LOW_CONFIDENCE` for the
    literal sentinel, `FLAG` for missing-on-label, `PASS` otherwise. Phase 3
    replaces this with the real deterministic per-field compare against
    application data.
    """
    fields: dict[str, FieldResult] = {}
    for name in _FIELD_NAMES:
        ext_val: str | None = getattr(extracted, name)
        app_val: str = getattr(application, name)

        status: FieldStatus
        note: str | None
        if ext_val == "LOW_CONFIDENCE":
            status = "LOW_CONFIDENCE"
            note = "Region too degraded to read with confidence."
        elif ext_val is None:
            status = "FLAG"
            note = "Field not found on label."
        else:
            status = "PASS"
            note = None

        fields[name] = FieldResult(
            status=status,
            extracted_value=ext_val,
            application_value=app_val,
            region_crop=None,
            note=note,
        )

    warning_status: FieldStatus = (
        "PASS" if extracted.government_warning.verbatim_text else "FLAG"
    )
    warning = WarningResult(
        status=warning_status,
        extracted_text=extracted.government_warning.verbatim_text,
        canonical_text=_CANONICAL_WARNING,
        is_all_caps=extracted.government_warning.is_all_caps,
        is_bold=extracted.government_warning.is_bold,
        is_continuous_paragraph=extracted.government_warning.is_continuous_paragraph,
        region_crop=None,
    )

    pass_count = sum(1 for f in fields.values() if f.status == "PASS")
    flag_count = sum(1 for f in fields.values() if f.status == "FLAG")
    low_count = sum(1 for f in fields.values() if f.status == "LOW_CONFIDENCE")

    return VerificationResult(
        extracted=extracted,
        fields=fields,
        government_warning=warning,
        summary=VerificationSummary(
            pass_count=pass_count,
            flag_count=flag_count,
            low_confidence_count=low_count,
            requires_full_manual_review=low_count >= 2,
        ),
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

    return _stage2_passthrough(extracted, request.application)


@router.post("/verify", response_model=VerificationResult)
async def verify(request: VerifyRequest) -> VerificationResult:
    """Verify a single label image against its application data."""
    return await run_single_verification(request)
