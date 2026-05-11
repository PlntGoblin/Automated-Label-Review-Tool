"""FastAPI entry point for the ALRT backend."""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

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


# Serve frontend static build if present (production / Render deploy).
_FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if _FRONTEND_DIST.is_dir():
    # Mount static assets (JS, CSS, fonts, images) under /assets
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="static")

    _FRONTEND_DIST_RESOLVED = _FRONTEND_DIST.resolve()

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        """Catch-all: serve index.html for SPA client-side routing."""
        file_path = (_FRONTEND_DIST / full_path).resolve()
        # Block path traversal — resolved path must stay inside the dist directory.
        if file_path.is_file() and str(file_path).startswith(str(_FRONTEND_DIST_RESOLVED)):
            return FileResponse(file_path)
        return FileResponse(_FRONTEND_DIST / "index.html")
