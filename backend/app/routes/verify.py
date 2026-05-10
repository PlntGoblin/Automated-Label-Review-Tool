"""POST /api/verify — single-label verification.

Phase 1: returns a hardcoded mock result so the API contract is locked
before the vision and comparison layers are wired in.
"""

import logging

from fastapi import APIRouter

from app.schemas import (
    BoundingBox,
    ExtractedLabel,
    FieldResult,
    VerificationResult,
    VerificationSummary,
    VerifyRequest,
    WarningExtraction,
    WarningResult,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# 27 CFR § 16.21(a) — canonical Government Warning text. Phase 3 lifts this
# constant into app/canonical.py; for now it is inlined to keep the Phase 1
# mock self-contained.
_CANONICAL_WARNING = (
    "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not "
    "drink alcoholic beverages during pregnancy because of the risk of birth "
    "defects. (2) Consumption of alcoholic beverages impairs your ability to "
    "drive a car or operate machinery, and may cause health problems."
)


def _mock_result(req: VerifyRequest) -> VerificationResult:
    """Build a hardcoded VerificationResult that exercises PASS, FLAG, and LOW_CONFIDENCE."""
    app_data = req.application

    extracted = ExtractedLabel(
        brand_name="Old Tom Distillery",
        class_or_type="Kentucky Straight Bourbon Whiskey",
        alcohol_content="44% Alc./Vol.",
        net_contents="750 mL",
        bottler_name_and_address="Old Tom Distillery, Louisville KY",
        country_of_origin="LOW_CONFIDENCE",
        government_warning=WarningExtraction(
            verbatim_text=_CANONICAL_WARNING,
            is_all_caps=True,
            is_bold=True,
            is_continuous_paragraph=True,
            bbox=BoundingBox(x=100, y=600, width=400, height=120),
        ),
        bboxes={
            "brand_name": BoundingBox(x=120, y=80, width=360, height=80),
            "class_or_type": BoundingBox(x=120, y=180, width=360, height=40),
            "alcohol_content": BoundingBox(x=120, y=240, width=180, height=30),
            "net_contents": BoundingBox(x=320, y=240, width=120, height=30),
            "bottler_name_and_address": BoundingBox(x=120, y=520, width=360, height=60),
            "country_of_origin": None,
        },
    )

    fields: dict[str, FieldResult] = {
        "brand_name": FieldResult(
            status="PASS",
            extracted_value="Old Tom Distillery",
            application_value=app_data.brand_name,
            region_crop=None,
            note="Case- and punctuation-insensitive match.",
        ),
        "class_or_type": FieldResult(
            status="PASS",
            extracted_value="Kentucky Straight Bourbon Whiskey",
            application_value=app_data.class_or_type,
            region_crop=None,
        ),
        "alcohol_content": FieldResult(
            status="FLAG",
            extracted_value="44% Alc./Vol.",
            application_value=app_data.alcohol_content,
            region_crop=None,
            note="Extracted alcohol content differs from application value.",
        ),
        "net_contents": FieldResult(
            status="PASS",
            extracted_value="750 mL",
            application_value=app_data.net_contents,
            region_crop=None,
        ),
        "bottler_name_and_address": FieldResult(
            status="PASS",
            extracted_value="Old Tom Distillery, Louisville KY",
            application_value=app_data.bottler_name_and_address,
            region_crop=None,
        ),
        "country_of_origin": FieldResult(
            status="LOW_CONFIDENCE",
            extracted_value=None,
            application_value=app_data.country_of_origin,
            region_crop=None,
            note="Region too degraded to read with confidence.",
        ),
    }

    warning = WarningResult(
        status="PASS",
        extracted_text=_CANONICAL_WARNING,
        canonical_text=_CANONICAL_WARNING,
        is_all_caps=True,
        is_bold=True,
        is_continuous_paragraph=True,
        region_crop=None,
    )

    summary = VerificationSummary(
        pass_count=4,
        flag_count=1,
        low_confidence_count=1,
        requires_full_manual_review=False,
    )

    return VerificationResult(
        extracted=extracted,
        fields=fields,
        government_warning=warning,
        summary=summary,
        manual_review_required=False,
        error_reason=None,
    )


@router.post("/verify", response_model=VerificationResult)
async def verify(request: VerifyRequest) -> VerificationResult:
    """Verify a single label image against its application data."""
    logger.info("verify request received (phase 1 stub)")
    return _mock_result(request)
