# Automated Label Review Tool (ALRT)

TTB reviewers check thousands of alcohol label applications against COLA submissions by hand. ALRT is a prototype that does the first pass automatically — a reviewer uploads a label image and the application data, and the system surfaces anything that needs a closer look.

The tool is intentionally advisory. It flags mismatches. It doesn't approve or deny anything. A human makes the compliance call.

> **Live demo:** https://alrt-299c.onrender.com

---

## How it works

The core idea is a two-stage pipeline:

**Stage 1 — Blind Extraction:** Claude reads the label image and returns what's physically printed on it. It has no idea what the application data says. This separation is intentional — if the model knew the "right answer," it might find it even when the label says something different. ([Why we did this](docs/decisions/ADR-001-blind-extraction.md))

**Stage 2 — Deterministic Comparison:** Python compares the extracted text against the application data field by field. Brand name, class/type, ABV, net contents, bottler address, country of origin, and the Government Warning are all checked. No AI involvement in this step — just code. ([Why](docs/decisions/ADR-002-two-stage-pipeline.md))

Each field comes back as **PASS**, **FLAG**, or **LOW_CONFIDENCE**. A reviewer sees the full label image alongside the results and can override any result with their initials.

---

## Run it locally

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install && npm run dev
```

Frontend at `http://localhost:5173` — API docs at `http://localhost:8000/docs`.

---

## Key decisions

The architecture docs/decisions folder has the reasoning behind the main calls:

- [ADR-001](docs/decisions/ADR-001-blind-extraction.md) — Why the model never sees the application data
- [ADR-002](docs/decisions/ADR-002-two-stage-pipeline.md) — Vision does the reading, Python does the judging
- [ADR-003](docs/decisions/ADR-003-model-selection.md) — Why Sonnet, and when we'd switch
- [ADR-004](docs/decisions/ADR-004-fuzzy-warning-matching.md) — Fuzzy matching for the Government Warning (and the honest caveat on the threshold)
- [ADR-005](docs/decisions/ADR-005-human-in-the-loop.md) — Why there's no automatic denial

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Frontend | React 18, Vite, TypeScript |
| Vision | Claude Sonnet 4.6 (Anthropic API) |
| Testing | pytest, Vitest |
| Deployment | Render |

---

## Tests

```bash
# Backend
cd backend && ./.venv/bin/python -m pytest

# Frontend
cd frontend && npm test
```

---

## What this prototype doesn't do

A few things were left out deliberately — not overlooked:

- **No authentication.** Any reviewer with the URL can use it. Fine for a prototype, not for production.
- **No persistent audit log.** Reviewer overrides live in the browser session. A production version would write these to a database with timestamps and user IDs.
- **No COLA system integration.** Application data is entered manually. The obvious next step is pulling it from TTB's existing systems.
- **Accuracy not validated at scale.** The fuzzy matching threshold for the Government Warning is a starting point, not a validated number. That requires a real labeled corpus.

These are the right next steps, not gaps we missed. See [docs/PRODUCTION.md](docs/PRODUCTION.md) for the full production path.
