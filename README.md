# Automated Label Review Tool (ALRT)

ALRT is a take-home prototype for supporting TTB alcohol label review. A reviewer uploads a label image and the corresponding COLA application data; the system extracts what is printed on the label, compares it against the application, and surfaces fields that need human attention.

The tool is intentionally human-in-the-loop. It flags mismatches and low-confidence fields; it does not make a compliance decision.

> **Live demo:** <https://alrt-299c.onrender.com>  
> **Status:** Prototype deployed on Render. Backend, frontend, batch review, demo mode, and tests are implemented.

## Quick Start

### Live Demo

Open <https://alrt-299c.onrender.com> and select one of the Quick Demo scenarios. Demo mode does not require an API key.

### Run Locally

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`; backend API docs are at `http://localhost:8000/docs`.

## What It Does

- Reviews single label images against structured application data.
- Supports batch verification for high-volume submissions.
- Uses blind image extraction so the model never sees the expected application values.
- Compares extracted fields in deterministic Python.
- Shows cropped label regions for flagged or low-confidence fields when usable bounding boxes are available.
- Verifies Government Warning text against the canonical 27 CFR § 16.21 wording while leaving final compliance judgment to the agent.
- Includes accessibility-oriented UI patterns and automated axe-core coverage.

## Architecture

ALRT uses a two-stage blind extraction design:

```text
React UI
  |
  v
FastAPI backend
  |
  +-- Stage 1: vision model extracts label text from image only
  |
  +-- Stage 2: deterministic Python compares extraction to application data
  |
  v
Pass / Flag / Low Confidence review UI
```

Why this matters: the model is not given the "right answer," so it cannot quietly complete its extraction toward the application data. That separation makes the result easier to audit and easier to reason about in a compliance workflow.

Key design choices:

- **Blind extraction:** the model receives the image only, never application data.
- **Deterministic verification:** brand, class/type, ABV, net contents, bottler, country, and warning text are checked in Python.
- **No FAIL state:** results are `PASS`, `FLAG`, or `LOW_CONFIDENCE`; the reviewer decides.
- **Latency-aware crops:** base64 crop generation is limited to fields that need review instead of every passing field.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Frontend | React 18, Vite, TypeScript, USWDS-inspired components |
| Vision | Claude Sonnet 4.6 via Anthropic API for the prototype |
| Testing | pytest, Vitest, Playwright axe-core |
| Deployment | Render single web service |

## Tests

```bash
# Backend
cd backend
./.venv/bin/python -m pytest
./.venv/bin/ruff check .

# Frontend
cd frontend
npm test
npm run build
npx playwright test
```

## Performance Notes

The target user experience is sub-5-second review for a single label. Actual latency depends heavily on image size, model response time, and hosting tier.

The backend logs request timing by stage:

- normalized image size
- vision extraction time
- deterministic verification time
- total request time

Recent performance-oriented changes:

- Reused the Anthropic async client for connection pooling.
- Reduced default max model output tokens to `1000`.
- Limited crop generation to flagged or low-confidence fields.
- Kept deterministic verification synchronous and lightweight.

For production, the right next step is a small benchmark harness against a representative label set rather than guessing from one-off demo requests.

## Known Prototype Limits

- No authentication.
- No audit log or persistence.
- No COLA system integration.
- Uses public Anthropic API in the prototype deployment.
- Accuracy has not been validated against a labeled historical TTB corpus.
- Render free-tier hosting can introduce cold starts and variable latency.

These are expected prototype boundaries, not hidden production assumptions. See [docs/PRODUCTION.md](docs/PRODUCTION.md) for the production path.

## API

Primary endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/verify` | Verify one label |
| `POST` | `/api/verify/batch` | Verify multiple labels |
| `GET` | `/health` | Liveness probe |

Full schema is available at `/docs` when the backend is running.

API details: [docs/API.md](docs/API.md)

## Repository Layout

```text
backend/    FastAPI service, model client, verification logic, pytest tests
frontend/   React/Vite application, UI components, Vitest and Playwright tests
docs/       Architecture, production notes, API notes, prompt documentation
render.yaml Render deployment blueprint
build.sh    Render build script
```

## License

MIT
