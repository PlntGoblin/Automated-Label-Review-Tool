"""Stage 2: Government Warning comparison against the canonical 27 CFR § 16.21 text."""

import re
import unicodedata

from app.canonical import CANONICAL_WARNING_TEXT
from app.schemas import FieldStatus, WarningExtraction, WarningResult


def normalize_for_warning(s: str) -> str:
    """Unicode NFC normalization, collapse internal whitespace, strip leading/trailing."""
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", " ", s).strip()


def check_government_warning(extracted: WarningExtraction) -> WarningResult:
    """Compare extracted Government Warning against canonical 27 CFR § 16.21(a)(2) text.

    Returns PASS on exact normalized match, FLAG on mismatch or missing text.
    Visual-property booleans are informational only and never flip the status.
    """
    if extracted.verbatim_text is None:
        # 27 CFR § 16.21 requires the warning on every label — absence is a FLAG.
        return WarningResult(
            status="FLAG",
            extracted_text=None,
            canonical_text=CANONICAL_WARNING_TEXT,
            is_all_caps=extracted.is_all_caps,
            is_bold=extracted.is_bold,
            is_continuous_paragraph=extracted.is_continuous_paragraph,
            region_crop=None,
        )

    canonical_norm = normalize_for_warning(CANONICAL_WARNING_TEXT)
    extracted_norm = normalize_for_warning(extracted.verbatim_text)

    status: FieldStatus = "PASS" if extracted_norm == canonical_norm else "FLAG"

    return WarningResult(
        status=status,
        extracted_text=extracted.verbatim_text,
        canonical_text=CANONICAL_WARNING_TEXT,
        is_all_caps=extracted.is_all_caps,
        is_bold=extracted.is_bold,
        is_continuous_paragraph=extracted.is_continuous_paragraph,
        region_crop=None,
    )
