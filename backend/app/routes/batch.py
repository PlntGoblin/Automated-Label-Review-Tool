"""POST /api/verify/batch — multi-label verification.

Phase 1: returns a list of hardcoded mock results, one per input.
Phase 5 wires in `asyncio.gather` with a semaphore-bounded concurrency.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.routes.verify import _mock_result
from app.schemas import VerificationResult, VerifyRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/verify/batch", response_model=list[VerificationResult])
async def verify_batch(requests: list[VerifyRequest]) -> list[VerificationResult]:
    """Verify a batch of labels. Returns one result per input, in order."""
    if len(requests) > settings.max_batch_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Batch size {len(requests)} exceeds maximum of {settings.max_batch_size}."
            ),
        )
    logger.info("batch request received: %d items (phase 1 stub)", len(requests))
    return [_mock_result(r) for r in requests]
