"""Stage 2: Government Warning comparison against the canonical 27 CFR § 16.21 text."""

import difflib
import re
import unicodedata

from app.canonical import CANONICAL_WARNING_TEXT
from app.schemas import FieldStatus, WarningExtraction, WarningResult

# Similarity thresholds (SequenceMatcher ratio, 0–1).
# PASS:             exact normalized match only.
# LOW_CONFIDENCE:   ≥0.82 — text is close; likely an OCR/rotation read error, not a real violation.
# FLAG:             <0.82 — text is genuinely different or missing.
_LOW_CONFIDENCE_THRESHOLD = 0.82


def normalize_for_warning(s: str) -> str:
    """Unicode NFC normalization, collapse internal whitespace, strip leading/trailing."""
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", " ", s).strip()


def _similarity(a: str, b: str) -> float:
    """SequenceMatcher ratio between two normalized strings (case-insensitive)."""
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()


def check_government_warning(extracted: WarningExtraction) -> WarningResult:
    """Compare extracted Government Warning against canonical 27 CFR § 16.21(a)(2) text.

    PASS:           exact normalized match.
    LOW_CONFIDENCE: text is close (≥82% similar) — likely an OCR/image-orientation issue.
    FLAG:           text is missing or genuinely different (<82% similar).
    Visual-property booleans are informational only and never flip the status.
    """
    if extracted.verbatim_text is None:
        return WarningResult(
            status="FLAG",
            extracted_text=None,
            canonical_text=CANONICAL_WARNING_TEXT,
            is_all_caps=extracted.is_all_caps,
            is_bold=extracted.is_bold,
            is_continuous_paragraph=extracted.is_continuous_paragraph,
            region_crop=None,
            note="Government Warning not found on label. 27 CFR § 16.21 requires it on every container.",
        )

    canonical_norm = normalize_for_warning(CANONICAL_WARNING_TEXT)
    extracted_norm = normalize_for_warning(extracted.verbatim_text)

    # Case-insensitive exact match — all-caps labels are legally equivalent to mixed-case.
    if extracted_norm.lower() == canonical_norm.lower():
        status: FieldStatus = "PASS"
        note = None
    else:
        ratio = _similarity(extracted_norm, canonical_norm)
        if ratio >= _LOW_CONFIDENCE_THRESHOLD:
            status = "LOW_CONFIDENCE"
            note = (
                f"Warning text is {ratio:.0%} similar to required 27 CFR § 16.21 language. "
                "Likely an image orientation or OCR read error — verify manually against the physical label."
            )
        else:
            status = "FLAG"
            note = (
                f"Warning text does not match required 27 CFR § 16.21 language ({ratio:.0%} similar). "
                "The extracted text may be truncated, altered, or unreadable. Manual review required."
            )

    return WarningResult(
        status=status,
        extracted_text=extracted.verbatim_text,
        canonical_text=CANONICAL_WARNING_TEXT,
        is_all_caps=extracted.is_all_caps,
        is_bold=extracted.is_bold,
        is_continuous_paragraph=extracted.is_continuous_paragraph,
        region_crop=None,
        note=note,
    )
