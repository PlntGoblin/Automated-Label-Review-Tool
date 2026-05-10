"""Contract tests for the Phase 1 mock endpoints.

These tests pin the API surface — request shapes, response shapes, and
boundary conditions. They survive the Phase 2/3/5 refactors that swap
the mock implementation for real model calls and deterministic compare,
because the contract is invariant.
"""

from typing import get_args

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import FieldStatus

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


def test_health_returns_ok() -> None:
    """The /health endpoint reports liveness."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_verify_returns_well_formed_result() -> None:
    """A valid request returns 200 with a complete VerificationResult."""
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
