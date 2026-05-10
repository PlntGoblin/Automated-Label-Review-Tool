"""Pydantic v2 schemas for the ALRT API contract."""

from typing import Literal, Optional

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

    verbatim_text: Optional[str]
    is_all_caps: Optional[bool]
    is_bold: Optional[bool]
    is_continuous_paragraph: Optional[bool]
    bbox: Optional[BoundingBox]


class ExtractedLabel(BaseModel):
    """Stage 1 output. Returned by the vision model after Blind Extraction."""

    brand_name: Optional[str]
    class_or_type: Optional[str]
    alcohol_content: Optional[str]
    net_contents: Optional[str]
    bottler_name_and_address: Optional[str]
    country_of_origin: Optional[str]
    government_warning: WarningExtraction
    bboxes: dict[str, Optional[BoundingBox]]


class VerifyRequest(BaseModel):
    """Single-label verification request body."""

    label_image: str
    application: ApplicationData


FieldStatus = Literal["PASS", "FLAG", "LOW_CONFIDENCE"]


class FieldResult(BaseModel):
    """Per-field comparison outcome surfaced to the agent."""

    status: FieldStatus
    extracted_value: Optional[str]
    application_value: str
    region_crop: Optional[str]
    note: Optional[str] = None


class WarningResult(BaseModel):
    """Government Warning comparison outcome."""

    status: FieldStatus
    extracted_text: Optional[str]
    canonical_text: str
    is_all_caps: Optional[bool]
    is_bold: Optional[bool]
    is_continuous_paragraph: Optional[bool]
    region_crop: Optional[str]


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
    error_reason: Optional[str] = None
