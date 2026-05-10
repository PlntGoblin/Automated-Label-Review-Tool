"""FastAPI entry point for the ALRT backend."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import batch, verify

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

app = FastAPI(
    title="ALRT — Automated Label Review Tool",
    description=(
        "TTB label verification prototype. Two-stage Blind Extraction: vision model "
        "extracts the label image only, deterministic Python compares against the "
        "application data. The system flags; the agent decides."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verify.router, prefix="/api", tags=["verification"])
app.include_router(batch.router, prefix="/api", tags=["verification"])


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
