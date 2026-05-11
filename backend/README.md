# ALRT Backend

FastAPI service for the Automated Label Review Tool. Two-stage **Blind Extraction**: the vision model extracts the label image only; deterministic Python compares the extraction against the application data. The service flags; the agent decides.

See the [top-level README](../README.md) for project context and the [build specification](../docs/PRD.md) for detailed architecture decisions.

## Requirements

- Python 3.12+
- An Anthropic API key (set as `ANTHROPIC_API_KEY`)

## Quickstart

From the `backend/` directory:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
```

## Running the dev server

```bash
uvicorn app.main:app --reload --port 8000
```

| URL | Purpose |
|---|---|
| <http://localhost:8000> | API root |
| <http://localhost:8000/docs> | Interactive Swagger docs |
| <http://localhost:8000/health> | Liveness probe |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/verify` | Single-label verification |
| POST | `/api/verify/batch` | Multi-label verification (semaphore-bounded concurrency) |
| GET | `/health` | Liveness probe |

Full schema and example payloads at `/docs` on the running server.

## Testing and linting

```bash
pytest                # all backend tests
ruff check .          # lint
ruff check --fix .    # lint + auto-fix
```

## Configuration

All configuration is loaded from environment variables (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | _(required)_ | API key for the vision model. Never commit. |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Vision model identifier. |
| `ANTHROPIC_MAX_TOKENS` | `1000` | Maximum tokens allowed in the extraction response. |
| `MAX_BATCH_SIZE` | `300` | Reject batches larger than this. |
| `MAX_CONCURRENT_REQUESTS` | `10` | Semaphore size for batch concurrency. |

## Project layout

```
app/
  main.py              # FastAPI entry, CORS, route mounting, static file serving
  config.py            # Pydantic Settings loaded from env
  schemas.py           # All Pydantic v2 schemas (the API contract)
  vision.py            # Stage 1: Blind Extraction client
  verification.py      # Stage 2: deterministic field comparison
  warning_check.py     # Government Warning checks
  cropping.py          # Image cropping + base64 encoding
  canonical.py         # 27 CFR § 16.21 canonical warning text
  routes/
    verify.py          # POST /api/verify
    batch.py           # POST /api/verify/batch
tests/                 # 133 pytest tests
```

## Architectural notes

- **Blind Extraction is non-negotiable.** The Stage 1 prompt sees the label image only — never the application data, the expected ABV, or the canonical warning text. This separation is what produces an auditable trail and prevents the model from "completing" toward a match.
- **The system flags; it never fails.** No `FAIL` state exists in code, API, or UI. Every per-field result is `PASS`, `FLAG`, or `LOW_CONFIDENCE`. The agent makes the compliance call.
- **Stateless prototype.** No database, no persistence, no auth. These are documented production-only features in the top-level README.
