"""POST /api/verify/batch — multi-label verification.

Concurrent today via `asyncio.gather`; Phase 5 adds the
semaphore-bounded concurrency required to stay under the model
provider's per-minute quota during peak importer submissions.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.routes.verify import run_single_verification
from app.schemas import VerificationResult, VerifyRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/verify/batch", response_model=list[VerificationResult])
async def verify_batch(requests: list[VerifyRequest]) -> list[VerificationResult]:
    """Verify a batch of labels concurrently. Returns one result per input, in order."""
    if len(requests) > settings.max_batch_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Batch size {len(requests)} exceeds maximum of {settings.max_batch_size}."
            ),
        )
    logger.info("batch request received: %d items", len(requests))
    return await asyncio.gather(
        *(run_single_verification(r) for r in requests)
    )
