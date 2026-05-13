"""POST /api/verify — single-label verification.

Stage 1 (vision) extracts label fields; Stage 2 (verification.verify_label)
runs deterministic per-field comparison against application data. On any
vision failure (malformed JSON, persistent API error, invalid base64),
the response carries `manual_review_required: true` with status 200 — the
agent sees the failure and reviews manually.
"""

import base64
import binascii
import io
import logging
import time

from fastapi import APIRouter, HTTPException
from PIL import Image

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

# Anthropic's vision models process images at ≤1568px on the longest side.
# Normalizing before upload ensures bbox coordinates match crop coordinates.
_MODEL_MAX_SIDE = 1568

# Magic-byte prefixes for accepted file types.
_VALID_MAGIC: tuple[bytes, ...] = (
    b"\xff\xd8\xff",        # JPEG
    b"\x89PNG\r\n\x1a\n",   # PNG
    b"%PDF",                 # PDF
)


def _normalize_image(image_bytes: bytes) -> bytes:
    """Resize image so its longest side is ≤ _MODEL_MAX_SIDE.

    This ensures the bounding-box coordinates Claude returns are in the same
    pixel space as the bytes passed to crop_region. If the image is already
    small enough, it is returned unchanged. PDFs are skipped (PIL can't handle
    them and Claude processes them page-by-page internally).
    """
    if image_bytes[:4] == b"%PDF":
        return image_bytes
    try:
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if max(w, h) <= _MODEL_MAX_SIDE:
            return image_bytes
        scale = _MODEL_MAX_SIDE / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        # Preserve original format where possible; fall back to JPEG.
        fmt = img.format or "JPEG"
        if fmt == "PNG":
            img.save(buf, format="PNG", optimize=True)
        else:
            img = img.convert("RGB")
            img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()
    except Exception:
        logger.warning("_normalize_image failed; using original bytes", exc_info=True)
        return image_bytes


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
    started = time.perf_counter()

    all_image_bytes: list[bytes] = []
    for img_b64 in request.label_images:
        try:
            image_bytes = base64.b64decode(img_b64, validate=True)
        except binascii.Error as e:
            logger.warning("invalid base64 label_image: %s", e)
            return _manual_review_result(request.application, f"Invalid base64 image: {e}")

        validation_error = _validate_image_bytes(image_bytes)
        if validation_error:
            logger.warning("image validation failed: %s", validation_error)
            return _manual_review_result(request.application, validation_error)

        all_image_bytes.append(_normalize_image(image_bytes))

    original_size = sum(len(b) for b in all_image_bytes)

    try:
        extraction_started = time.perf_counter()
        extracted = await vision.extract(all_image_bytes)
        extraction_ms = (time.perf_counter() - extraction_started) * 1000
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

    # Use first image for crop operations (bbox coords Claude returns are
    # relative to the first image when multiple are sent).
    primary_bytes = all_image_bytes[0]

    verification_started = time.perf_counter()
    result = verify_label(extracted, request.application, primary_bytes)

    # Gov warning rotation re-extraction only makes sense with a single image —
    # bbox coordinates are ambiguous across multiple images.
    if len(all_image_bytes) == 1:
        gov_bbox = extracted.government_warning.bbox
        if (
            result.government_warning.status != "PASS"
            and gov_bbox is not None
            and gov_bbox.height > gov_bbox.width
        ):
            logger.info("gov warning rotated bbox detected — attempting targeted re-extraction")
            try:
                img = Image.open(io.BytesIO(primary_bytes))
                img_w, img_h = img.size
                x1 = max(gov_bbox.x, 0)
                y1 = max(gov_bbox.y, 0)
                x2 = min(gov_bbox.x + gov_bbox.width, img_w)
                y2 = min(gov_bbox.y + gov_bbox.height, img_h)
                cropped = img.crop((x1, y1, x2, y2)).rotate(-90, expand=True)
                buf = io.BytesIO()
                cropped.save(buf, format="PNG")
                reread_text = await vision.extract_warning_text(buf.getvalue())
                if reread_text:
                    from app.schemas import WarningExtraction
                    from app.warning_check import check_government_warning
                    reread_extraction = WarningExtraction(
                        verbatim_text=reread_text,
                        is_all_caps=extracted.government_warning.is_all_caps,
                        is_bold=extracted.government_warning.is_bold,
                        is_continuous_paragraph=extracted.government_warning.is_continuous_paragraph,
                        bbox=gov_bbox,
                    )
                    reread_result = check_government_warning(reread_extraction)
                    status_rank = {"PASS": 0, "LOW_CONFIDENCE": 1, "FLAG": 2}
                    cur_rank = status_rank[result.government_warning.status]
                    if status_rank[reread_result.status] < cur_rank:
                        reread_result.region_crop = result.government_warning.region_crop
                        result.government_warning = reread_result
                        logger.info(
                            "gov warning re-extraction improved status to %s",
                            reread_result.status,
                        )
            except Exception:
                logger.warning("gov warning re-extraction failed", exc_info=True)

    verification_ms = (time.perf_counter() - verification_started) * 1000
    total_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "verification complete: image_count=%d original_bytes=%d "
        "extraction_ms=%.0f verification_ms=%.0f total_ms=%.0f",
        len(all_image_bytes),
        original_size,
        extraction_ms,
        verification_ms,
        total_ms,
    )
    return result


@router.post("/verify", response_model=VerificationResult)
async def verify(request: VerifyRequest) -> VerificationResult:
    """Verify one or more label images against application data."""
    for img_b64 in request.label_images:
        try:
            raw = base64.b64decode(img_b64, validate=True)
        except binascii.Error:
            pass
        else:
            error = _validate_image_bytes(raw)
            if error:
                raise HTTPException(status_code=422, detail=error)
    return await run_single_verification(request)
