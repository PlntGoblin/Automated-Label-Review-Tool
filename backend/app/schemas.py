"""Pydantic v2 schemas for the ALRT API contract."""

from typing import Literal

from pydantic import BaseModel, ConfigDict


class ApplicationData(BaseModel):
    """Data submitted to TTB by the applicant."""

    model_config = ConfigDict(str_strip_whitespace=True)

    brand_name: str
    class_or_type: str
    alcohol_content: str
    net_contents: str
    bottler_name_and_address: str
    country_of_origin: str


class BoundingBox(BaseModel):
    """Pixel-coordinate bounding box returned by the vision model."""

    x: int
    y: int
    width: int
    height: int


class WarningExtraction(BaseModel):
    """Government Warning fields extracted by the vision model."""

    verbatim_text: str | None
    is_all_caps: bool | None
    is_bold: bool | None
    is_continuous_paragraph: bool | None
    bbox: BoundingBox | None


class ExtractedLabel(BaseModel):
    """Stage 1 output. Returned by the vision model after Blind Extraction."""

    brand_name: str | None
    class_or_type: str | None
    alcohol_content: str | None
    net_contents: str | None
    bottler_name_and_address: str | None
    country_of_origin: str | None
    government_warning: WarningExtraction
    bboxes: dict[str, BoundingBox | None]


class VerifyRequest(BaseModel):
    """Single-label verification request body."""

    label_images: list[str]
    application: ApplicationData


FieldStatus = Literal["PASS", "FLAG", "LOW_CONFIDENCE"]


class FieldResult(BaseModel):
    """Per-field comparison outcome surfaced to the agent."""

    status: FieldStatus
    extracted_value: str | None
    application_value: str
    region_crop: str | None
    note: str | None = None


class WarningResult(BaseModel):
    """Government Warning comparison outcome."""

    status: FieldStatus
    extracted_text: str | None
    canonical_text: str
    is_all_caps: bool | None
    is_bold: bool | None
    is_continuous_paragraph: bool | None
    region_crop: str | None
    note: str | None = None


class VerificationSummary(BaseModel):
    """Aggregate counts across all per-field results."""

    pass_count: int
    flag_count: int
    low_confidence_count: int
    requires_full_manual_review: bool


class VerificationResult(BaseModel):
    """Top-level response for a single-label verification."""

    extracted: ExtractedLabel
    fields: dict[str, FieldResult]
    government_warning: WarningResult
    summary: VerificationSummary
    manual_review_required: bool = False
    error_reason: str | None = None
