# Automated Label Review Tool (ALRT)

A prototype web application for the U.S. Department of the Treasury's Alcohol and Tobacco Tax and Trade Bureau (TTB) that uses AI vision models to support the verification of alcohol beverage labels against their corresponding Certificate of Label Approval (COLA) application data.

> **Status:** Take-home prototype. Backend complete (vision extraction, deterministic comparison, image cropping, input validation, batch support). Frontend complete (USWDS, demo mode, 50 component tests). Deployed on Render.
>
> **Source:** <https://github.com/PlntGoblin/Automated-Label-Review-Tool>
> **Live demo:** <https://alrt.onrender.com>

---

## Quick start for reviewers

**Option 1 — Live demo (no setup):**
Visit the [live demo](https://alrt.onrender.com) and click any of the three **Quick Demo** cards to see the full verification UI with pre-loaded results. No API key needed.

**Option 2 — Run locally:**
See [Running locally](#running-locally) below for full backend+frontend setup with real vision extraction.

---

## Overview

A TTB compliance agent uploads a label image alongside the corresponding application data. ALRT extracts the on-label fields using a vision model, compares them against the application data in deterministic Python, and presents a per-field review checklist with image crops of each region for the agent's final judgement.

The tool is positioned as a **support system for human reviewers**, not a decision-maker. It surfaces flags; the agent decides.

It supports both single-label review and batch processing for high-volume importer submissions.

## Why it matters

TTB processes roughly 150,000 label applications per year with 47 compliance agents — about 13 labels per agent per workday. Most agent time is spent on routine field matching: confirming the brand name on the label matches the brand name on the application, the ABV matches, the government warning is present and formatted correctly. The volume is small for an AI system but large for human review, so the value is agent time saved on routine checks, not raw throughput.

## Key requirements addressed

- **Sub-5-second response time** per label, so the tool fits naturally into agent workflow rather than slowing it down.
- **Batch upload** for peak-season importer submissions of 200–300 labels at once, processed concurrently.
- **Government Warning verification** that handles both the exact wording (per 27 CFR § 16.21) and visual formatting flags.
- **Tolerant field matching** that flags meaningful mismatches but recognizes cosmetic variations (e.g. `STONE'S THROW` vs. `Stone's Throw`).
- **Accessibility** designed to minimize onboarding time by mirroring the existing review workflow, with Section 508 conformance as a production requirement.

---

## Architecture

ALRT uses a two-stage **Blind Extraction** architecture: the vision model extracts what it sees on the label without ever seeing the application data, and a deterministic Python layer compares the extraction against the application afterward. Separating extraction from comparison improves auditability and reduces the risk of the model hallucinating toward a match.

```
┌──────────────────┐      ┌──────────────────────────────────────┐      ┌────────────────────┐
│  React Frontend  │ ───▶ │  FastAPI Backend                     │      │  Claude Sonnet 4.6 │
│  (USWDS + a11y)  │      │                                      │      │  (vision, blind)   │
└──────────────────┘      │  Stage 1: Blind Extraction           │ ───▶ │                    │
        ▲                 │   • Image only — no application data │      └────────────────────┘
        │                 │   • Returns JSON + region crops      │                ▲
        │                 │                                      │                │
        │                 │  Stage 2: Deterministic Compare      │                │
        │                 │   • Python matches extracted ↔ app   │ ◀──── extracted JSON
        │                 │   • Flags mismatches; never "fails"  │
        │                 │   • § 16.21 warning text equality    │
        │                 └──────────────────────────────────────┘
        │                                  │
        └────  Pass / Flag review UI  ◀────┘
              with image crops per field
```

The agent never sees a binary "FAIL." Each flagged field is shown alongside the application value AND a cropped image of the region on the label where the mismatch was found, so the agent confirms in seconds rather than hunting across the label.

### Key design decisions

**Blind Extraction.** The Stage 1 prompt does not include the application data, the expected ABV range, the brand name, or any hint of a "correct" label. The model is instructed to extract text exactly as written, return `null` for fields that are not physically printed, and return `LOW_CONFIDENCE` for fields where the image is too degraded to read with certainty. This separation removes a documented VLM failure mode where the model "completes" a JSON toward expected values, and it produces a cleaner audit trail — the model never had access to the answer.

**VLM-first, judgement-in-Python.** Single VLM call followed by deterministic Python comparison. This architecture reflects the broader industry trend toward end-to-end vision-language extraction paired with a deterministic validation layer. It avoids the latency and operational complexity that prior multi-hop OCR + LLM pipelines have reportedly struggled with.

**Government Warning verification — extracted text plus image crop.** Vision models are not reliably accurate at subjective visual judgements like "is this text bold?" or "is this 2mm tall?" The model returns the extracted warning text and three visual-property booleans (`is_all_caps`, `is_bold`, `is_continuous_paragraph`), but the UI always shows the agent the cropped warning region next to the canonical 27 CFR § 16.21 text. The agent confirms styling visually in one click. Faster and more accurate than relying on the model's definition of "bold."

**Pass / Flag, not Pass / Fail.** The Python verifier returns `PASS`, `FLAG`, or `LOW_CONFIDENCE` per field. The system never declares a label non-compliant. The agent makes the final compliance call.

### Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Frontend | React 18 + Vite + TypeScript, USWDS components |
| AI/Vision | Claude Sonnet 4.6 (Anthropic API) for the prototype; FedRAMP-High options documented under production migration below |
| Validation | Pydantic v2 |
| Testing | pytest (133 backend) + Vitest (71 frontend) + Playwright axe-core (5 a11y) |
| Deployment | Render (prototype only) |

### Cost at TTB scale

At ~150k labels/year, hosted inference costs are operationally negligible relative to staffing costs. Production deployment supports either FedRAMP-authorized hosted inference or fully self-hosted VLM deployment inside a Treasury boundary; the choice is a procurement decision, not a cost decision.

| Model | Per label | Per year (150k labels) |
|---|---|---|
| Gemini 2.5 Flash | $0.0019 | $285 |
| Claude Haiku 4.5 | $0.0047 | $705 |
| Claude Sonnet 4.5 | $0.0141 | $2,115 |
| Self-hosted PaddleOCR-VL-1.5 (1× A100) | ~$0 marginal | ~$9–10k (GPU) |

### Production migration path

The prototype runs against the public Anthropic API. Three production paths are available; the choice is driven by Treasury procurement and CISO preferences rather than cost.

1. **Self-hosted small VLM inside a Treasury FedRAMP boundary.** PaddleOCR-VL-1.5 (Apache 2.0, ~0.9B params) on a single A10/A100 GPU inside Azure Government or AWS GovCloud. No outbound ML traffic. Typically the easiest CISO sign-off because all label imagery stays inside the Treasury network.
2. **FedRAMP-authorized hosted inference.** Claude on AWS Bedrock GovCloud, Claude for Government via the GSA OneGov agreement, GPT on Azure OpenAI Government, or Gemini on Vertex AI Assured Workloads. Same code as the prototype with a different endpoint.
3. **Multi-vendor flexibility.** The prompt + JSON contract is model-agnostic, so the backend can be wired to swap between options 1 and 2 via a config flag, neutralizing single-vendor lock-in concerns.

### Operational behavior

- **Retries.** A failed model call (network error, malformed JSON, timeout) is retried once with exponential backoff. A second failure does not produce an automatic compliance determination; the request is marked for manual review and surfaced in the UI with the underlying error.
- **Malformed extraction.** If the model returns JSON that does not match the expected schema, the request fails closed — no compliance verdict is produced and the result is flagged for manual review.
- **Low-confidence handling.** When two or more fields return `LOW_CONFIDENCE`, the entire label is flagged for full manual review rather than partial automated comparison.
- **Rate limits.** Batch endpoints use `asyncio.gather` with a semaphore set to the model provider's per-minute limit, so peak bursts complete within bounded wall-clock time without exceeding quota.

### Security posture

- No model training on uploaded data (per Anthropic's API terms; equivalent guarantees available under all FedRAMP-High channels).
- Stateless processing in the prototype — label images and extracted data are not persisted.
- Environment-variable secret management; no credentials committed to source.
- Production deployment intended for FedRAMP-authorized infrastructure with audit logging aligned to controls AU-2, AU-3, and AU-11.
- Input validation on all uploads (file type, size limits, content sniffing) to mitigate malicious-payload risks.

### Section 508 conformance

Section 508 / WCAG 2.1 Level AA is a legal requirement for Treasury applications, not an optional enhancement. The prototype implements the architectural choices below; the full conformance review is part of the production handoff.

**Architecture for accessibility.** USWDS components for the application chrome, full keyboard navigation across the entire review flow, ARIA labels with full status context (e.g. `aria-label="Flagged: Brand Name mismatch — extracted 'Stone's Throw', application 'STONE'S THROW'"`), high-contrast mode, configurable font sizing, and descriptive alt text for both label images and cropped region views.

**Conformance toolchain.** `axe-core` integrated into CI via `@axe-core/playwright` for automated regressions; ANDI (the bookmarklet used by Treasury and SSA accessibility testers) for manual verification; manual screen reader testing with NVDA on Windows and JAWS; a keyboard-only walkthrough of the full review.

**Conformance review process.** Automated `axe-core` scan, manual ANDI inspection of every status icon and dynamic element, keyboard-only walkthrough including image zoom, and production of a VPAT-based Accessibility Conformance Report listing each WCAG 2.1 AA criterion as Supported, Partially Supported, or Not Supported.

---

## Running locally

### Prerequisites

- Python 3.12+
- Node.js 20+
- An Anthropic API key (set as `ANTHROPIC_API_KEY`)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

API at `http://localhost:8000`, auto-generated docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI at `http://localhost:5173`.

### Tests

```bash
# Backend (133 tests)
cd backend && source .venv/bin/activate && pytest

# Frontend (71 component tests)
cd frontend && npm test

# Accessibility (5 axe-core scans)
cd frontend && npx playwright test
```

---

## Deployment

The app deploys as a single Render web service. The backend serves the frontend static build.

### Deploy to Render

1. Fork this repo (or connect your GitHub account to Render).
2. Create a new **Web Service** from the repo.
3. Render will auto-detect `render.yaml` and configure the build.
4. Set the `ANTHROPIC_API_KEY` environment variable in the Render dashboard.
5. Deploy.

The build script (`build.sh`) installs Python deps, builds the frontend with Vite, and the FastAPI app serves the static files at the root URL.

> **Note:** The demo mode works without an API key. Real label verification requires `ANTHROPIC_API_KEY` to be set.

---

## Using the app

1. **Quick Demo** — click any demo card on the landing page to see pre-loaded verification results instantly (no API key needed).
2. **Verify Your Own Label** — upload a label image (JPG, PNG, or PDF), fill in the application data, and click **Verify Label**.
3. Review the **Pass / Flag** checklist. Each flagged field shows the extracted value, the application value, and a cropped image of the region on the label where the field was found.

For batch processing, use `POST /api/verify/batch` to submit multiple label images and application data; results return the same structure per label.

---

## API reference

`POST /api/verify` — Single-label verification.

```json
{
  "label_image": "<base64-encoded image>",
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

Response includes:
- `extracted` — raw JSON from the vision model, with `null` for missing fields and `LOW_CONFIDENCE` for unreadable ones
- `fields` — per-field results with status (`PASS` / `FLAG` / `LOW_CONFIDENCE`), extracted value, application value, and a base64 image crop
- `government_warning` — extracted text, visual-property booleans, and a base64 crop of the warning region
- `summary` — counts of passing, flagged, and low-confidence fields

`POST /api/verify/batch` — Multi-label verification, returns the same structure per label.

Full schema at `/docs` on the running server.

---

## Approach and assumptions

This is a take-home prototype, so several decisions were made in the absence of explicit direction. The brief invites this — flagging them for transparency.

**Assumptions:**

- The system flags rather than fails. AI in a federal compliance context is a support tool for human decision-makers; the agent makes the final compliance call.
- Tolerant field matching uses case-insensitive, punctuation-normalized comparison and surfaces the raw extracted value alongside the application value so the agent can confirm.
- Government Warning compliance is decided by the agent. The Python layer compares the extracted text to the canonical 27 CFR § 16.21 text using Unicode-normalized string equality; the UI shows the cropped warning region for typography verification.
- No persistence in the prototype — each request is stateless.
- No COLA integration — standalone proof-of-concept per the brief.
- No prior open-source COLA verification tool exists that could be forked. This prototype demonstrates one possible implementation pattern.

**Trade-offs and known limitations:**

- The 5-second target depends on the model provider's response time. Measured p50 for Claude Sonnet 4.6 on a single label is ~2.5–3.5s; p95 is ~5s.
- Tolerant matching is heuristic and will not catch every edge case. The cropped-region UI is the safety net.
- The vision model returns `LOW_CONFIDENCE` rather than guessing on degraded images; the UI surfaces a "re-photograph recommended" status.
- Benchmark performance does not translate directly to performance on actual TTB imagery. Production rollout requires a labeled validation set (see below).
- This prototype has no authentication, no audit logging, and no data retention policy. Production deployment requires all three.

**What a production version would add (priority order):**

1. **A labeled validation corpus and measured accuracy.** ~500 historical COLAs stratified by beverage type and image quality, with measured precision and recall per field and explicit thresholds the system must meet before procurement. Everything below depends on this.
2. **Deployment inside a FedRAMP-High boundary** — preferred path is the self-hosted small VLM option for CISO sign-off; hosted Claude / GPT / Gemini on FedRAMP-authorized endpoints as alternatives.
3. **Authentication via existing Treasury SSO** (likely SAML to Treasury PIV/CAC infrastructure).
4. **Audit logging** of every verification — input application data, extracted JSON, per-field PASS/FLAG decisions, agent's final disposition, and a hash of the label image for non-repudiation.
5. **Section 508 conformance review and ACR production** — automated `axe-core` in CI plus manual ANDI/NVDA/JAWS testing.
6. **COLA integration** — at minimum, structured handoff to the existing system.
7. **Confidence-based escalation rules** — automatically route multi-field-low-confidence labels to full manual review.

---

## Repository structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point + static file serving
│   │   ├── routes/
│   │   │   ├── verify.py        # POST /api/verify
│   │   │   └── batch.py         # POST /api/verify/batch
│   │   ├── verification.py      # Stage 2: deterministic field comparison
│   │   ├── warning_check.py     # Government Warning text + visual checks
│   │   ├── cropping.py          # Defensive bbox validation + region cropping
│   │   ├── vision.py            # Stage 1: Blind Extraction client
│   │   ├── schemas.py           # Pydantic models (API contract)
│   │   ├── canonical.py         # 27 CFR § 16.21 warning text constant
│   │   └── config.py            # Environment-driven settings
│   ├── tests/                   # 133 pytest tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app shell with tabs + demo mode
│   │   ├── components/          # LabelUpload, ApplicationForm, ReviewChecklist,
│   │   │                        # FieldRow, WarningPanel, SummaryBar,
│   │   │                        # BatchUpload, BatchResults
│   │   ├── demo-scenarios.ts    # 3 pre-canned verification scenarios
│   │   ├── constants.ts         # Shared field labels and status classes
│   │   ├── util.ts              # Shared helpers (fileToBase64)
│   │   ├── api.ts               # Backend API client
│   │   └── types.ts             # TypeScript contract (mirrors schemas.py)
│   ├── tests/
│   │   └── a11y.spec.ts         # Playwright + axe-core accessibility tests
│   ├── package.json
│   └── vite.config.ts
├── .github/workflows/
│   └── a11y.yml                 # Accessibility CI on every PR
├── build.sh                     # Render build script
├── render.yaml                  # Render deployment blueprint
└── README.md
```

---

## License

MIT.

## Acknowledgments

Built as a take-home project for a Treasury IT Specialist position. Stakeholder context (Sarah Chen, Marcus Williams, Dave Morrison, Jenny Park) is from the project brief and is fictional.
