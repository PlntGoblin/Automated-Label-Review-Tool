"""In-process LRU cache for vision extraction results.

Keyed by SHA-256 of the normalized image bytes. Identical label images
(same file submitted twice, batch re-runs) skip the API call entirely.

The cache is intentionally in-process rather than Redis so there are zero
infrastructure dependencies. A Redis backend can be swapped in later by
replacing the _CACHE dict with a redis-py client and keeping the same
get/set interface.

Capacity: 256 entries (~256 labels). Each ExtractedLabel is <2 KB of JSON,
so worst-case memory is ~512 KB — negligible.
"""

import hashlib
import logging
from collections import OrderedDict
from threading import Lock
from typing import Optional

from app.schemas import ExtractedLabel

logger = logging.getLogger(__name__)

_CAPACITY = 256
_cache: OrderedDict[str, ExtractedLabel] = OrderedDict()
_lock = Lock()


def _key(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


def get(image_bytes: bytes) -> Optional[ExtractedLabel]:
    """Return a cached ExtractedLabel or None on a miss."""
    k = _key(image_bytes)
    with _lock:
        if k not in _cache:
            return None
        # Move to end (most-recently-used).
        _cache.move_to_end(k)
        logger.debug("cache hit: %s", k[:12])
        return _cache[k]


def set(image_bytes: bytes, result: ExtractedLabel) -> None:
    """Store an ExtractedLabel, evicting the LRU entry if at capacity."""
    k = _key(image_bytes)
    with _lock:
        if k in _cache:
            _cache.move_to_end(k)
        _cache[k] = result
        if len(_cache) > _CAPACITY:
            evicted = _cache.popitem(last=False)
            logger.debug("cache evict: %s", evicted[0][:12])


def size() -> int:
    """Current number of cached entries."""
    with _lock:
        return len(_cache)
