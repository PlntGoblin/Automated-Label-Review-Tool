# PRD: Automated Label Review Tool (ALRT)

> **Audience: Claude Code.** This document is a build specification, not a product brief. Read top-to-bottom once, then implement phase-by-phase. Each phase has explicit file paths, dependencies, and acceptance criteria. Do not skip phases or implement out of order — earlier phases produce artifacts that later phases depend on.

---

## 0. Project context (read first, do not skip)

You are building a take-home prototype for a U.S. Department of the Treasury IT Specialist position. The prototype is a web application that helps TTB compliance agents verify alcohol beverage labels against their Certificate of Label Approval (COLA) application data using AI vision.

**The architecture is non-negotiable: two-stage Blind Extraction.**

- Stage 1: A vision model receives the **label image only** — never the application data — and extracts what it sees as structured JSON.
- Stage 2: Deterministic Python compares the extracted JSON against the application data and returns per-field `PASS` / `FLAG` / `LOW_CONFIDENCE` results.

The system never declares a label "FAILED." It surfaces flags for an agent's review. This Pass/Flag distinction is a deliberate values choice and must be reflected in API names, UI text, log messages, and variable names. Do not introduce a `"FAIL"` state anywhere.

**Three other rules that must hold throughout the codebase:**

1. The application data must never be sent to the vision model. If you find yourself passing application fields into a prompt or system message, stop and re-read this section.
2. Fields that need agent attention (`FLAG` or `LOW_CONFIDENCE`) surface a cropped image of the label region when a usable bounding box is available. Passing fields keep `region_crop: null` to avoid bloating the response.
3. The Government Warning is checked in two ways: (a) Unicode-normalized exact string equality against the canonical 27 CFR § 16.21 text in deterministic Python, and (b) the model returns visual-property booleans plus a region crop when the warning is flagged. The model never decides whether the warning is compliant.

---

## 1. Tech stack (use exactly this)

**Backend**
- Python 3.12
- FastAPI (latest stable)
- Pydantic v2
- `anthropic` Python SDK (latest)
- `Pillow` for image cropping
- `httpx` for any outbound HTTP needs
- `pytest` + `pytest-asyncio` for tests
- `python-multipart` for file uploads
- `uvicorn[standard]` for the dev server

**Frontend**
- React 18
- Vite
- TypeScript (strict mode)
- `@uswds/uswds` (U.S. Web Design System) for components
- `axios` or `fetch` for API calls (prefer `fetch`)
- No state-management library — `useState` and `useReducer` are sufficient

**Tooling**
- `ruff` for Python lint+format
- `eslint` + `prettier` for frontend
- `@axe-core/playwright` for accessibility CI
- `pytest` for backend tests, `vitest` for frontend tests

**Do NOT use:**
- A database. The prototype is stateless.
- Authentication libraries. The prototype is unauthenticated; this is documented as a known limitation.
- A separate worker queue. Batch processing uses `asyncio.gather` with a semaphore.
- localStorage / sessionStorage. State is React state only.

---

## 2. Repository structure (create exactly this)

```
/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry, CORS, route mounting
│   │   ├── config.py               # Settings loaded from env (ANTHROPIC_API_KEY, etc.)
│   │   ├── schemas.py              # All Pydantic models
│   │   ├── vision.py               # Stage 1: Blind Extraction client
│   │   ├── verification.py         # Stage 2: deterministic field comparison
│   │   ├── warning_check.py        # Government Warning specific logic
│   │   ├── cropping.py             # Image cropping + base64 encoding
│   │   ├── canonical.py            # Canonical 27 CFR § 16.21 warning text
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── verify.py           # POST /api/verify
│   │       └── batch.py            # POST /api/verify/batch
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_verification.py
│   │   ├── test_warning_check.py
│   │   └── test_cropping.py
│   ├── pyproject.toml              # ruff config + project metadata
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md                   # Backend-only quickstart
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts           # Typed wrapper around fetch calls
│   │   ├── components/
│   │   │   ├── LabelUpload.tsx
│   │   │   ├── ApplicationForm.tsx
│   │   │   ├── ReviewChecklist.tsx
│   │   │   ├── FieldRow.tsx        # one row in the checklist
│   │   │   ├── WarningPanel.tsx    # the cropped-region + canonical-text panel
│   │   │   └── BatchUpload.tsx
│   │   ├── types.ts                # TypeScript types matching backend schemas
│   │   └── styles/
│   │       └── app.css
│   ├── public/
│   ├── tests/
│   │   └── a11y.spec.ts            # @axe-core/playwright tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── sample_labels/
│   ├── pass/                       # 3-5 labels that should match cleanly
│   │   ├── README.md
│   │   ├── old_tom_distillery.jpg
│   │   ├── old_tom_distillery.json
│   │   └── ...
│   └── flag/                       # 3-5 labels with deliberate mismatches
│       ├── README.md
│       ├── abv_mismatch.jpg
│       ├── abv_mismatch.json       # application data with the mismatch
│       └── ...
├── docs/
│   ├── prompts/
│   │   └── stage1_blind_extraction.txt
│   └── architecture.md
├── .gitignore
├── LICENSE
└── README.md                       # Top-level project README (already exists)
```

---

## 3. Build phases

Build in this order. Each phase ends with a verification step you must run before proceeding.

### Phase 1 — Backend skeleton + schemas

**Goal:** A runnable FastAPI app that returns hardcoded mock data, so the contract is locked before adding the model call.

**Files to create:**
- `backend/app/config.py` — Pydantic Settings class loading `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), `ANTHROPIC_MAX_TOKENS` (default `1000`), `MAX_BATCH_SIZE` (default `300`), `MAX_CONCURRENT_REQUESTS` (default `10`).
- `backend/app/schemas.py` — see Section 4 below for exact schemas. All schemas in this one file.
- `backend/app/main.py` — FastAPI app, CORS allowing `http://localhost:5173`, mount routes from `routes/`.
- `backend/app/routes/verify.py` — `POST /api/verify` accepting the request schema, returning a hardcoded `VerificationResult` for now.
- `backend/app/routes/batch.py` — `POST /api/verify/batch` accepting a list, returning a list of hardcoded results.
- `backend/requirements.txt` — pin major versions only.
- `backend/.env.example` — copy of expected env vars with placeholder values.
- `backend/pyproject.toml` — `[tool.ruff]` config with line length 100.

**Acceptance criteria:**
- `uvicorn app.main:app --reload --port 8000` starts without errors
- `GET http://localhost:8000/docs` shows the auto-generated OpenAPI page
- `POST /api/verify` with a valid request body returns a 200 with the hardcoded mock result
- `POST /api/verify/batch` with a list of 1 request returns a list of 1 result
- `ruff check backend/` passes

### Phase 2 — Stage 1: Blind Extraction (vision module)

**Goal:** Replace the hardcoded mock with a real call to the configured Claude vision model that performs Blind Extraction.

**Files to create/modify:**
- `backend/app/vision.py` — see Section 5 for the exact prompt and response handling.
- `docs/prompts/stage1_blind_extraction.txt` — the system prompt as a separate file, loaded by `vision.py`. Keeping it as a text file makes prompt tuning easier.
- Modify `backend/app/routes/verify.py` to call `vision.extract(image_bytes)` and pass the result to the (still-hardcoded) Stage 2.

**Hard rules for `vision.py`:**
- The function signature is `async def extract(image_bytes: bytes) -> ExtractedLabel` — note: no application data parameter, by design. If you find yourself adding one, stop.
- The system prompt is loaded from disk, not embedded in code, so it can be reviewed without reading Python.
- The prompt explicitly forbids the model from inferring missing data and requires `null` for missing fields and `"LOW_CONFIDENCE"` for unreadable ones.
- Response parsing wraps `json.loads` in a try/except and raises `MalformedExtractionError` on failure.
- One automatic retry with exponential backoff (1s, 2s) on transient errors (network, 429, 5xx). Do not retry on schema validation failures.
- The function never raises on a successful API call with malformed JSON — it raises a typed exception that the route handler catches and converts to a manual-review response.

**Acceptance criteria:**
- Calling `/api/verify` with a real label image returns extracted JSON from the model
- The extracted JSON is validated against the `ExtractedLabel` Pydantic schema before being returned
- Inducing a malformed response (e.g. by temporarily breaking the schema) results in a `manual_review_required` response with status 200 and a clear `error_reason` field — not a 500
- The system prompt file does not leak expected values or success criteria to the model. Verify with `grep -iE 'application data|expected value|correct (label|value)|should (be|match)|expected to'` — should return nothing. JSON key names that happen to contain `brand` or similar are fine; what we forbid is language that tells the model what the right answer looks like.

### Phase 3 — Stage 2: Deterministic comparison

**Goal:** Implement the field-by-field comparison logic in Python.

**Files to create:**
- `backend/app/verification.py` — see Section 6 for comparison rules.
- `backend/app/warning_check.py` — Government Warning specific logic.
- `backend/app/canonical.py` — exactly one constant: `CANONICAL_WARNING_TEXT`, the verbatim 27 CFR § 16.21(a)(2) text. Include the section reference as a comment above the constant.
- `backend/tests/test_verification.py` — unit tests for every comparison rule.
- `backend/tests/test_warning_check.py` — unit tests including: exact match, whitespace variants, missing parenthetical numbers, lowercase variants, extra punctuation.

**Comparison rules (implement exactly these):**

| Field | Rule |
|---|---|
| `brand_name` | Case- and punctuation-insensitive equality. `STONE'S THROW` matches `Stone's Throw`. Different alphanumerics → `FLAG`. |
| `class_or_type` | Case-insensitive substring or equality. The application's class designation must appear in the extracted text. |
| `alcohol_content` | Numeric extraction (regex), then tolerance check: ±0.3% for malt beverages, ±1.5% for wine ≥7% ABV, exact for distilled spirits. |
| `net_contents` | Normalize to mL (parse "750 mL", "1 L", "12 fl oz" → mL), then exact numeric match. |
| `bottler_name_and_address` | Case- and punctuation-insensitive substring match: the application's bottler text must appear (after normalization) somewhere in the extracted text. |
| `country_of_origin` | Case-insensitive equality after standardizing common variants (`USA` ≡ `United States` ≡ `U.S.A.`). |
| `government_warning` | See `warning_check.py` rules below. |

A field is `LOW_CONFIDENCE` if the extracted value is the literal string `"LOW_CONFIDENCE"`. A field is `PASS` if the comparison succeeds. Any other case is `FLAG`.

**Government Warning rules:**
1. Compare `extracted.government_warning.verbatim_text` against `CANONICAL_WARNING_TEXT` after Unicode normalization (NFC) and whitespace collapsing.
2. If the extracted text is missing entirely → `FLAG`.
3. If the extracted text matches canonical exactly after normalization → `PASS` for the text component.
4. If the extracted text is non-empty but does not match → `FLAG`, and include the diff in the response.
5. The visual-property booleans (`is_all_caps`, `is_bold`, `is_continuous_paragraph`) are reported in the response as informational fields. They do **not** flip the status from `PASS` to `FLAG`. If the warning text is flagged, the agent reviews them in the UI alongside the cropped image.

**Acceptance criteria:**
- `pytest backend/tests/` passes with at least 90% coverage of `verification.py` and `warning_check.py`
- A canonical warning text test confirms the constant matches 27 CFR § 16.21(a)(2) exactly (write the test with the text typed twice and assert equality)
- A test confirms the comparison correctly handles all four states: `PASS`, `FLAG`, `LOW_CONFIDENCE`, missing-field

### Phase 4 — Image cropping for region overlays

**Goal:** Each non-passing `FieldResult` includes a cropped image of the region on the label where the field was found when a usable bounding box is available.

**Files to create:**
- `backend/app/cropping.py` — `def crop_region(image: bytes, bbox: BoundingBox | None, image_size: tuple[int, int]) -> str | None` returning a base64-encoded PNG or `None`.
- `backend/tests/test_cropping.py` — tests covering valid bbox, bbox outside image bounds (clamp to edges), tiny bbox (rejected), zero/negative dimensions (rejected), bbox larger than the image (rejected), bbox with all-zero coordinates (rejected).

**Implementation notes:**
- The vision model is asked to return approximate bounding boxes as `{"x": int, "y": int, "width": int, "height": int}` in pixel coordinates relative to the input image. **Treat these coordinates as untrusted.** VLM bbox accuracy is the weak link in the architecture; the defensive logic below is required, not optional.
- Crops are padded by 10% on each side for visual context, clamped to image bounds.
- Crops are returned as base64-encoded PNG strings prefixed with `data:image/png;base64,` so the frontend can use them directly as `<img src>`.

**Bounding-box validation (do all of these before cropping):**
- If `bbox is None` (model didn't return one for that field) → return `None`.
- If `width <= 0` or `height <= 0` → return `None`.
- If the bbox is entirely outside the image bounds → return `None`.
- If the bbox is smaller than 20×20 pixels (likely garbage coordinates) → return `None`.
- If the bbox covers more than 90% of the image area (the model "gave up" and returned a near-full-image box) → return `None`.
- Otherwise: clamp `x`, `y`, `width`, `height` to image bounds, apply 10% padding (also clamped), and crop.

When `crop_region` returns `None`, the `region_crop` field on the corresponding `FieldResult` is `None` and the frontend renders a small "no preview available" placeholder instead of a broken `<img>`. The status of the field itself is unaffected — bbox failures do not change `PASS` / `FLAG` / `LOW_CONFIDENCE`.

**Acceptance criteria:**
- A real verification call returns crops for `FLAG` / `LOW_CONFIDENCE` fields where the model produced usable bboxes; passing fields and fields with bad bboxes have `region_crop: null` and no errors thrown
- Tests cover all six rejection cases above
- The frontend renders gracefully when `region_crop` is `null` — no broken image icons
- Inducing a deliberately bad bbox (e.g. coordinates `{x: -50, y: -50, width: 10, height: 10}`) does not raise an exception and does not produce a malformed crop

### Phase 5 — Operational hardening

**Goal:** The behaviors documented in the README's "Operational behavior" section are real, not aspirational.

**Implement:**
- One retry on the model call with 1s/2s exponential backoff
- `MalformedExtractionError` → 200 response with `manual_review_required: true` and `error_reason` set
- Two-or-more `LOW_CONFIDENCE` fields → response includes `requires_full_manual_review: true`
- Batch endpoint uses `asyncio.gather` with a semaphore of size `MAX_CONCURRENT_REQUESTS`
- Batch with > `MAX_BATCH_SIZE` items returns 422 with a clear error message
- Input validation: file type whitelist (JPEG, PNG, PDF), 10 MB per file limit, magic-byte sniffing

**Acceptance criteria:**
- A test that mocks the model client to fail once then succeed returns a successful response
- A test that mocks the model client to fail twice returns `manual_review_required: true`
- A test posting an oversized file returns 422

### Phase 6 — Frontend skeleton

**Goal:** A working React app that calls the backend and displays results.

**Files to create:**
- `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- `frontend/src/types.ts` — TypeScript types mirroring the backend Pydantic schemas exactly. Field names match.
- `frontend/src/api/client.ts` — typed `verifyLabel(image, application)` and `verifyBatch(...)` functions
- `frontend/src/components/LabelUpload.tsx` — drag-and-drop or button upload, displays the selected image
- `frontend/src/components/ApplicationForm.tsx` — controlled form with USWDS form components for each application field
- `frontend/src/components/ReviewChecklist.tsx` — renders a list of `FieldRow`s
- `frontend/src/components/FieldRow.tsx` — renders one field's status, extracted value, application value, and cropped image when present. Status indicator uses USWDS color tokens, NOT raw red/green. Includes `aria-label` with full status context. When `region_crop` is `null`, render a small placeholder rather than a broken image element.
- `frontend/src/components/WarningPanel.tsx` — side-by-side when flagged: cropped warning region image | canonical 27 CFR § 16.21 text. Visual booleans displayed as informational chips.

**UI rules:**
- The status icon for each field has a complete `aria-label` of the form `Flagged: ${fieldName} mismatch — extracted '${extracted}', application '${application}'`. Screen readers should be able to convey the full state without sighted context.
- Use USWDS color tokens for status: `Pass` uses success-token, `Flag` uses warning-token, `Low confidence` uses info-token. **Do not use red.** The system flags; it does not condemn.
- All interactive elements are reachable by keyboard tab order.
- The canonical 27 CFR § 16.21 text is rendered as static, copyable, monospaced text in the `WarningPanel`.

**Acceptance criteria:**
- The frontend is buildable (`npm run build`) without errors
- A full single-label verification flow works end-to-end against the local backend
- Manual keyboard-only walkthrough completes the entire flow without using a mouse

### Phase 7 — Batch UI

**Goal:** Multi-label upload and a sortable results table.

**Files to create:**
- `frontend/src/components/BatchUpload.tsx` — accepts multiple image files and a CSV of application data
- A simple results table with one row per label, sortable by status (flagged first by default), expandable to show per-field details

**CSV format for batch application data:**
```
filename,brand_name,class_or_type,alcohol_content,net_contents,bottler_name_and_address,country_of_origin
old_tom.jpg,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45% Alc./Vol.,750 mL,"Old Tom Distillery, Louisville KY",USA
```

The frontend matches CSV rows to uploaded files by `filename`. Mismatched filenames are surfaced as errors before the batch is submitted.

**Acceptance criteria:**
- Submitting 5 labels in a batch returns 5 results, all displayed in the table
- Mismatched filenames between CSV and uploads produce a pre-submission error, not a server-side error

### Phase 8 — Sample labels for the demo

**Goal:** A small, reviewable corpus that exercises every code path.

**Create in `sample_labels/`:**
- 3 passing labels: distilled spirit (e.g. bourbon), wine, beer. Each has a JSON file alongside it with the matching application data.
- 5 flagged labels, each demonstrating a different failure mode: ABV mismatch, brand name mismatch, missing Government Warning, malformed Government Warning (lowercase), severely degraded image (LOW_CONFIDENCE expected).
- A `README.md` in `sample_labels/` listing each label and what it demonstrates.

You may generate these test labels using AI image generation (the brief explicitly endorses this). Make the demonstrated failures unambiguous so a reviewer immediately sees the system catching them.

**Acceptance criteria:**
- Running each sample label through the deployed app produces the expected status for each field
- The `sample_labels/README.md` documents what each label is meant to demonstrate

### Phase 9 — Accessibility CI

**Goal:** Automated `axe-core` checks on every commit.

**Files to create:**
- `frontend/tests/a11y.spec.ts` — Playwright + axe tests covering: the empty form, the upload state, a results state with a passing label, a results state with a flagged label, and the batch results table.
- A GitHub Actions workflow at `.github/workflows/a11y.yml` running the Playwright tests on every PR.

**Acceptance criteria:**
- The Playwright + axe suite runs locally with `npx playwright test` and passes
- The GitHub Action is configured (it does not need to actually run unless the repo is public)

### Phase 10 — Deployment

**Goal:** A public URL the reviewer can click.

**Use Render.** Two services in one Render account:
1. A web service for the FastAPI backend (Python runtime, build from `backend/`)
2. A static site for the frontend (build from `frontend/`)

The backend's `ANTHROPIC_API_KEY` lives in Render's environment variables, never in code. The frontend's API base URL is configured at build time from a `VITE_API_BASE_URL` env var.

**Acceptance criteria:**
- The deployed URL accepts a real label image upload and returns a result
- The deployed URL is added to the top-level README's "Live demo" section

---

## 4. Schemas (Pydantic v2 — implement these exactly in `backend/app/schemas.py`)

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

class ApplicationData(BaseModel):
    """Data submitted to TTB by the applicant."""
    model_config = ConfigDict(str_strip_whitespace=True)
    brand_name: str
    class_or_type: str
    alcohol_content: str          # raw text as on the form, e.g. "45% Alc./Vol."
    net_contents: str             # raw text, e.g. "750 mL"
    bottler_name_and_address: str
    country_of_origin: str

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class WarningExtraction(BaseModel):
    verbatim_text: Optional[str]                # None if not found
    is_all_caps: Optional[bool]
    is_bold: Optional[bool]
    is_continuous_paragraph: Optional[bool]
    bbox: Optional[BoundingBox]

class ExtractedLabel(BaseModel):
    """Stage 1 output. Returned by the vision model."""
    brand_name: Optional[str]                   # None if not on label
    class_or_type: Optional[str]
    alcohol_content: Optional[str]              # raw extracted text
    net_contents: Optional[str]
    bottler_name_and_address: Optional[str]
    country_of_origin: Optional[str]
    government_warning: WarningExtraction
    bboxes: dict[str, Optional[BoundingBox]]    # one per field name above

class VerifyRequest(BaseModel):
    label_image: str                            # base64-encoded
    application: ApplicationData

FieldStatus = Literal["PASS", "FLAG", "LOW_CONFIDENCE"]

class FieldResult(BaseModel):
    status: FieldStatus
    extracted_value: Optional[str]
    application_value: str
    region_crop: Optional[str]                  # base64 PNG data URL
    note: Optional[str] = None                  # short human-readable explanation

class WarningResult(BaseModel):
    status: FieldStatus
    extracted_text: Optional[str]
    canonical_text: str
    is_all_caps: Optional[bool]
    is_bold: Optional[bool]
    is_continuous_paragraph: Optional[bool]
    region_crop: Optional[str]

class VerificationSummary(BaseModel):
    pass_count: int
    flag_count: int
    low_confidence_count: int
    requires_full_manual_review: bool

class VerificationResult(BaseModel):
    extracted: ExtractedLabel
    fields: dict[str, FieldResult]              # keyed by field name
    government_warning: WarningResult
    summary: VerificationSummary
    manual_review_required: bool = False
    error_reason: Optional[str] = None
```

Frontend `types.ts` mirrors these exactly.

---

## 5. Stage 1 prompt (write to `docs/prompts/stage1_blind_extraction.txt`)

```
You are a literalist scribe extracting regulated information from an alcohol beverage label image. Your only job is to report what is physically printed on the label. You do not interpret, infer, calculate, or guess.

Return a single JSON object with these exact keys:
- brand_name
- class_or_type
- alcohol_content    (the raw text as printed, e.g. "45% Alc./Vol." or "12% Alc./Vol.")
- net_contents       (the raw text as printed, e.g. "750 mL" or "12 FL OZ")
- bottler_name_and_address
- country_of_origin
- government_warning (an object with keys: verbatim_text, is_all_caps, is_bold, is_continuous_paragraph, bbox)
- bboxes             (an object mapping each top-level field name above to a bounding box {x, y, width, height} in pixel coordinates)

Rules:
1. Extract text exactly as written. Preserve casing, punctuation, and abbreviations.
2. If a field is not physically printed on the label, return null for that field. Do not infer values from other fields. Do not calculate ABV from proof. Do not guess country of origin from the bottler address.
3. If a field is partially obscured, blurred, or otherwise unreadable, return the literal string "LOW_CONFIDENCE" for that field rather than guessing.
4. For government_warning.verbatim_text, return the entire warning block as a single string with original line breaks preserved. If no warning is present, return null.
5. For government_warning visual properties: is_all_caps applies only to the words "GOVERNMENT WARNING" at the start of the warning. is_bold is your best assessment of whether those words are visually bold. is_continuous_paragraph is true if the warning is one connected block of text rather than broken across separate sections of the label.
6. For bboxes, return approximate pixel coordinates for the region containing each field. If a field is null, omit it from bboxes.
7. Return only the JSON object. No prose, no explanation, no markdown fences.
```

This prompt is structured to never leak expected values or success criteria to the model. Verify with `grep -iE 'application data|expected value|correct (label|value)|should (be|match)|expected to'` — should return nothing. The grep test in Phase 2's acceptance criteria uses the same pattern.

---

## 6. Comparison logic helpers (recommended structure for `verification.py`)

Implement these as small pure functions, each independently unit-testable:

```python
def normalize_for_brand(s: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""

def normalize_for_warning(s: str) -> str:
    """Unicode NFC, collapse internal whitespace, strip leading/trailing whitespace."""

def parse_abv(s: str) -> float | None:
    """Extract a percentage float from strings like '45% Alc./Vol.', '12% ABV', '90 Proof'."""

def parse_volume_ml(s: str) -> float | None:
    """Parse '750 mL', '1 L', '12 fl oz' etc. into mL."""

def standardize_country(s: str) -> str:
    """USA ≡ United States ≡ U.S.A. → 'UNITED STATES'."""

def compare_field(extracted: str | None, application: str, rule: ComparisonRule) -> FieldResult:
    """Apply the comparison rule and return a FieldResult."""
```

Keep `verify_label(extracted: ExtractedLabel, application: ApplicationData) -> VerificationResult` as the top-level orchestrator that assembles the final result.

---

## 7. Code style

- All public functions have type hints and short docstrings (one sentence).
- No comments that just restate the code.
- Comments are reserved for non-obvious *why* — e.g. citing 27 CFR sections, or explaining a regex.
- Constants are `UPPER_SNAKE_CASE` and live in `canonical.py` or near where they're used.
- All exceptions raised by your code are typed (e.g. `MalformedExtractionError(Exception)`), never bare `Exception` or `ValueError`.
- No `print` statements. Use the `logging` module with named loggers per module.

---

## 8. Don't do these things

- Do not introduce a `FAIL` state. The system flags.
- Do not pass `application` data into the vision model. Stage 1 sees the image only.
- Do not use a database, ORM, Redis, or any persistence layer. Each request is stateless.
- Do not auto-retry more than once on model errors. One retry, then surface for manual review.
- Do not catch broad `Exception` to hide errors. Catch typed exceptions and surface them in the response.
- Do not introduce "AI confidence scores" beyond the LOW_CONFIDENCE literal. The model does not output a numeric confidence; do not invent one.
- Do not build any background-job system. Batch is `asyncio.gather` with a semaphore.
- Do not write tests that hit the live Anthropic API. Mock the client in tests.
- Do not include the user's name, email, or other PII in any logged output. Logs include request IDs only.
- Do not add unrequested features (chat interface, label history, user accounts, etc.). The scope is exactly what is in this PRD.

---

## 9. Definition of done

Before declaring the project complete:

- [ ] `pytest backend/tests/` passes with ≥90% coverage of `verification.py`, `warning_check.py`, `cropping.py`
- [ ] `ruff check backend/` passes
- [ ] `npm run build` in `frontend/` completes without errors or warnings
- [ ] `npx playwright test` in `frontend/` passes (axe accessibility tests)
- [ ] All 8 sample labels (3 passing, 5 flagged) produce the expected results when run through the deployed app
- [ ] The deployed URL is functional and added to the top-level `README.md`
- [ ] The Stage 1 prompt file passes the grep test in Section 5
- [ ] A keyboard-only walkthrough of the entire single-label and batch flow completes without using a mouse
- [ ] Top-level `README.md` is up to date with the deployed URL filled in

---

## 10. If you get stuck

If you encounter ambiguity not covered by this PRD, default to the option that:
1. Keeps the application data out of the model prompt
2. Surfaces flags rather than declaring failures
3. Adds the least new state or infrastructure
4. Mirrors the existing review workflow (the printed checklist Jenny mentions in the brief)

When in doubt, do less. This is a prototype — clean, working core functionality is preferred over ambitious additional features.
