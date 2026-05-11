# API

The backend serves a FastAPI API under `/api`. Interactive OpenAPI docs are available at `/docs` when the service is running.

## `POST /api/verify`

Verify one label image against one application record.

### Request

```json
{
  "label_image": "<base64-encoded JPEG, PNG, or PDF>",
  "application": {
    "brand_name": "OLD TOM DISTILLERY",
    "class_or_type": "Kentucky Straight Bourbon Whiskey",
    "alcohol_content": "45% Alc./Vol.",
    "net_contents": "750 mL",
    "bottler_name_and_address": "Old Tom Distillery, Louisville KY",
    "country_of_origin": "USA"
  }
}
```

### Response Shape

```json
{
  "extracted": {
    "brand_name": "Old Tom Distillery",
    "class_or_type": "Kentucky Straight Bourbon Whiskey",
    "alcohol_content": "45% Alc./Vol.",
    "net_contents": "750 mL",
    "bottler_name_and_address": "Old Tom Distillery, Louisville KY",
    "country_of_origin": "USA",
    "government_warning": {
      "verbatim_text": "GOVERNMENT WARNING: ...",
      "is_all_caps": true,
      "is_bold": true,
      "is_continuous_paragraph": true,
      "bbox": null
    },
    "bboxes": {}
  },
  "fields": {
    "brand_name": {
      "status": "PASS",
      "extracted_value": "Old Tom Distillery",
      "application_value": "OLD TOM DISTILLERY",
      "region_crop": null,
      "note": null
    }
  },
  "government_warning": {
    "status": "PASS",
    "extracted_text": "GOVERNMENT WARNING: ...",
    "canonical_text": "GOVERNMENT WARNING: ...",
    "is_all_caps": true,
    "is_bold": true,
    "is_continuous_paragraph": true,
    "region_crop": null
  },
  "summary": {
    "pass_count": 6,
    "flag_count": 0,
    "low_confidence_count": 0,
    "requires_full_manual_review": false
  },
  "manual_review_required": false,
  "error_reason": null
}
```

## `POST /api/verify/batch`

Verify multiple labels in one request.

### Request

```json
[
  {
    "label_image": "<base64-encoded JPEG, PNG, or PDF>",
    "application": {
      "brand_name": "OLD TOM DISTILLERY",
      "class_or_type": "Kentucky Straight Bourbon Whiskey",
      "alcohol_content": "45% Alc./Vol.",
      "net_contents": "750 mL",
      "bottler_name_and_address": "Old Tom Distillery, Louisville KY",
      "country_of_origin": "USA"
    }
  }
]
```

### Response

Returns an array of `VerificationResult` objects with the same shape as `/api/verify`.

## Status Values

| Status | Meaning |
|---|---|
| `PASS` | The deterministic comparison matched |
| `FLAG` | Reviewer attention is needed |
| `LOW_CONFIDENCE` | The model found the field but could not read it confidently |

## Error Handling

Invalid base64, model failures, and malformed model JSON are surfaced as manual review results where possible:

```json
{
  "manual_review_required": true,
  "error_reason": "Vision API failed: ..."
}
```

Clearly unsupported file types or oversized uploads are rejected with `422`.

## Upload Limits

- Accepted types: JPEG, PNG, PDF
- Maximum upload size: 10 MB
- Images are normalized before model submission so bounding boxes align with crop coordinates.
