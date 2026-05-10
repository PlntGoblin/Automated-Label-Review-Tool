"""Contract tests for the API surface and the Stage 1 prompt.

Phase 2 wires real vision extraction in. The vision module is mocked in
tests — per PRD §8, tests must not hit the live Anthropic API. Each test
that exercises the verify pipeline applies its own monkeypatch on
`app.vision.extract`.
"""

import re
from pathlib import Path
from typing import get_args

import pytest
from fastapi.testclient import TestClient

from app import vision as vision_module
from app.main import app
from app.schemas import ExtractedLabel, FieldStatus, WarningExtraction
from app.vision import MalformedExtractionError, VisionAPIError

client = TestClient(app)

VALID_APPLICATION = {
    "brand_name": "OLD TOM DISTILLERY",
    "class_or_type": "Kentucky Straight Bourbon Whiskey",
    "alcohol_content": "45% Alc./Vol.",
    "net_contents": "750 mL",
    "bottler_name_and_address": "Old Tom Distillery, Louisville KY",
    "country_of_origin": "USA",
}

VALID_REQUEST = {
    "label_image": "Zm9v",
    "application": VALID_APPLICATION,
}

_CANONICAL_WARNING_FOR_TESTS = (
    "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not "
    "drink alcoholic beverages during pregnancy because of the risk of birth "
    "defects. (2) Consumption of alcoholic beverages impairs your ability to "
    "drive a car or operate machinery, and may cause health problems."
)

FAKE_EXTRACTION = ExtractedLabel(
    brand_name="Old Tom Distillery",
    class_or_type="Kentucky Straight Bourbon Whiskey",
    alcohol_content="45% Alc./Vol.",
    net_contents="750 mL",
    bottler_name_and_address="Old Tom Distillery, Louisville KY",
    country_of_origin="USA",
    government_warning=WarningExtraction(
        verbatim_text=_CANONICAL_WARNING_FOR_TESTS,
        is_all_caps=True,
        is_bold=True,
        is_continuous_paragraph=True,
        bbox=None,
    ),
    bboxes={},
)


def _patch_extract(monkeypatch: pytest.MonkeyPatch, fake) -> None:
    """Replace app.vision.extract with the given async coroutine for one test."""
    monkeypatch.setattr(vision_module, "extract", fake)


def test_health_returns_ok() -> None:
    """The /health endpoint reports liveness."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_verify_returns_well_formed_result(monkeypatch: pytest.MonkeyPatch) -> None:
    """A valid request with a successful extraction returns 200 with a complete VerificationResult."""

    async def fake_extract(image_bytes: bytes) -> ExtractedLabel:
        return FAKE_EXTRACTION

    _patch_extract(monkeypatch, fake_extract)

    response = client.post("/api/verify", json=VALID_REQUEST)
    assert response.status_code == 200
    body = response.json()

    assert "extracted" in body
    assert "fields" in body
    assert "government_warning" in body
    assert "summary" in body
    assert body["manual_review_required"] is False

    valid_statuses = set(get_args(FieldStatus))
    for field_name, field in body["fields"].items():
        assert field["status"] in valid_statuses, (
            f"{field_name} has invalid status: {field['status']}"
        )
        assert "extracted_value" in field
        assert "application_value" in field
        assert "region_crop" in field

    summary = body["summary"]
    assert isinstance(summary["pass_count"], int)
    assert isinstance(summary["flag_count"], int)
    assert isinstance(summary["low_confidence_count"], int)
    assert isinstance(summary["requires_full_manual_review"], bool)


def test_verify_returns_manual_review_on_malformed_extraction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A MalformedExtractionError surfaces as 200 + manual_review_required: true."""

    async def fake_extract(image_bytes: bytes) -> ExtractedLabel:
        raise MalformedExtractionError("simulated parse failure")

    _patch_extract(monkeypatch, fake_extract)

    response = client.post("/api/verify", json=VALID_REQUEST)
    assert response.status_code == 200
    body = response.json()
    assert body["manual_review_required"] is True
    assert body["error_reason"] is not None
    assert "malformed" in body["error_reason"].lower()


def test_verify_returns_manual_review_on_vision_api_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A persistent VisionAPIError surfaces as 200 + manual_review_required: true."""

    async def fake_extract(image_bytes: bytes) -> ExtractedLabel:
        raise VisionAPIError("simulated API failure after retry")

    _patch_extract(monkeypatch, fake_extract)

    response = client.post("/api/verify", json=VALID_REQUEST)
    assert response.status_code == 200
    body = response.json()
    assert body["manual_review_required"] is True
    assert body["error_reason"] is not None
    assert "api" in body["error_reason"].lower()


def test_verify_returns_manual_review_on_invalid_base64() -> None:
    """An undecodable label_image returns 200 + manual_review_required: true (not a 500)."""
    response = client.post(
        "/api/verify",
        json={"label_image": "!@#$%", "application": VALID_APPLICATION},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["manual_review_required"] is True
    assert "base64" in body["error_reason"].lower()


def test_verify_rejects_missing_application_field() -> None:
    """Pydantic rejects a request missing a required application field."""
    bad_application = {k: v for k, v in VALID_APPLICATION.items() if k != "brand_name"}
    response = client.post(
        "/api/verify",
        json={"label_image": "Zm9v", "application": bad_application},
    )
    assert response.status_code == 422


def test_batch_over_limit_returns_422() -> None:
    """A batch larger than MAX_BATCH_SIZE is rejected at the route layer."""
    oversized = [VALID_REQUEST] * 301
    response = client.post("/api/verify/batch", json=oversized)
    assert response.status_code == 422
    assert "exceeds maximum" in response.json()["detail"]


def test_batch_empty_list_returns_empty_list() -> None:
    """An empty batch is a valid (if useless) request and returns an empty list."""
    response = client.post("/api/verify/batch", json=[])
    assert response.status_code == 200
    assert response.json() == []


def test_stage1_prompt_does_not_leak_expected_values() -> None:
    """The Blind Extraction prompt must not tell the model what the right answer looks like.

    Per PRD §5: the prompt is forbidden from containing language that leaks
    expected values or success criteria to the model. The grep regex below
    is the literal acceptance criterion from PRD §2 Phase 2.
    """
    prompt_path = (
        Path(__file__).resolve().parent.parent.parent
        / "docs"
        / "prompts"
        / "stage1_blind_extraction.txt"
    )
    text = prompt_path.read_text(encoding="utf-8")
    forbidden = re.compile(
        r"application data|expected value|correct (label|value)|should (be|match)|expected to",
        re.IGNORECASE,
    )
    matches = forbidden.findall(text)
    assert not matches, f"Prompt leaks expected values or success criteria: {matches}"
