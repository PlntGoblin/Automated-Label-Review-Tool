# Architecture

ALRT uses a two-stage blind extraction architecture for compliance review support.

## Flow

```text
React frontend
  |
  v
FastAPI backend
  |
  +-- Stage 1: Blind Extraction
  |     - receives label image only
  |     - returns extracted JSON and bounding boxes
  |
  +-- Stage 2: Deterministic Compare
        - compares extraction against application data
        - returns PASS, FLAG, or LOW_CONFIDENCE per field
        - attaches crops only for fields needing review
```

## Blind Extraction

The vision model receives the uploaded label image and the extraction prompt only. It does not receive:

- application data
- expected brand name
- expected ABV
- expected net contents
- canonical warning text as an answer key

This avoids a common vision-language failure mode where a model completes toward supplied expected values instead of reporting what is actually printed.

The prompt asks the model to return:

- `brand_name`
- `class_or_type`
- `alcohol_content`
- `net_contents`
- `bottler_name_and_address`
- `country_of_origin`
- `government_warning`
- bounding boxes for fields it found

If a field is not physically printed, the model returns `null`. If it is present but unreadable, it returns `LOW_CONFIDENCE`.

## Deterministic Verification

The backend compares extracted values against application data in Python:

- brand names are normalized for casing and punctuation
- ABV is parsed numerically with beverage-class tolerance
- net contents are normalized to milliliters
- country names use common aliases like `USA` and `United States`
- Government Warning text is normalized and compared to the canonical 27 CFR § 16.21 text

The model extracts. Python judges the comparison. The reviewer makes the compliance decision.

## Result States

ALRT intentionally has no `FAIL` state.

| Status | Meaning |
|---|---|
| `PASS` | Extracted value matches application data under deterministic rules |
| `FLAG` | Mismatch or missing required field needs reviewer attention |
| `LOW_CONFIDENCE` | Model saw the field but could not read it confidently |

## Crops

The model returns approximate bounding boxes. The backend validates boxes defensively and returns base64 PNG crops only for fields that need review:

- `FLAG`
- `LOW_CONFIDENCE`
- flagged Government Warning

Passing fields keep `region_crop: null`. This keeps the response smaller and avoids spending request-path time encoding crops that the reviewer does not need.

## Operational Behavior

- Model calls retry once on transient provider/network failures.
- Persistent model failures return `manual_review_required: true`.
- Malformed model JSON fails closed into manual review.
- Batch requests are processed concurrently behind a configurable semaphore.
- Extraction results are cached in-process by normalized image hash.

## Main Modules

| File | Purpose |
|---|---|
| `backend/app/vision.py` | Anthropic vision client and model JSON parsing |
| `backend/app/verification.py` | Deterministic field comparison and result assembly |
| `backend/app/warning_check.py` | Government Warning text checks |
| `backend/app/cropping.py` | Defensive bbox validation and crop encoding |
| `backend/app/routes/verify.py` | Single-label request pipeline |
| `backend/app/routes/batch.py` | Batch verification pipeline |
| `frontend/src/App.tsx` | Main application flow |
| `frontend/src/components/ReviewChecklist.tsx` | Review result surface |
