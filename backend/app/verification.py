"""Stage 2: Deterministic field comparison between ExtractedLabel and ApplicationData."""

import logging
import re
import unicodedata

from app.schemas import (
    ApplicationData,
    ExtractedLabel,
    FieldResult,
    FieldStatus,
    VerificationResult,
    VerificationSummary,
)
from app.warning_check import check_government_warning

logger = logging.getLogger(__name__)

# Sentinel returned by the vision model when a field is physically present but unreadable.
_LOW_CONFIDENCE_SENTINEL = "LOW_CONFIDENCE"
_LOW_CONF_NOTE = "Region too degraded to read."

# fl oz → mL conversion per NIST
_FL_OZ_TO_ML = 29.5735

# Precompiled volume regexes — checked in order: mL before L to avoid partial matches.
_ML_RE = re.compile(r"(\d+(?:\.\d+)?)\s*ml\b", re.IGNORECASE)
_L_RE = re.compile(r"(\d+(?:\.\d+)?)\s*[lL]\b")
_FL_OZ_RE = re.compile(r"(\d+(?:\.\d+)?)\s*fl\.?\s*oz\.?", re.IGNORECASE)
_OZ_RE = re.compile(r"(\d+(?:\.\d+)?)\s*oz\b", re.IGNORECASE)

# Country-of-origin aliases normalized to a single canonical form.
_COUNTRY_ALIASES: dict[str, str] = {
    "usa": "UNITED STATES",
    "us": "UNITED STATES",
    "u.s.": "UNITED STATES",
    "u.s.a.": "UNITED STATES",
    "u.s.a": "UNITED STATES",
    "united states": "UNITED STATES",
    "united states of america": "UNITED STATES",
    "america": "UNITED STATES",
}

# Keywords used to classify a beverage type from the class/type designation.
_MALT_TERMS = frozenset(
    ("beer", "ale", "lager", "stout", "porter", "malt", "pilsner", "ipa", "wheat", "bock", "saison")
)
_WINE_TERMS = frozenset(
    ("wine", "champagne", "sparkling", "vermouth", "port", "sherry", "mead", "sake", "cider")
)


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------


def normalize_for_brand(s: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    s = unicodedata.normalize("NFC", s).lower()
    s = re.sub(r"[^\w\s]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def normalize_for_warning(s: str) -> str:
    """Unicode NFC, collapse internal whitespace, strip leading/trailing whitespace."""
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_abv(s: str) -> float | None:
    """Extract a percentage float from strings like '45% Alc./Vol.', '12% ABV', '90 Proof'."""
    # Proof: "90 proof" → 45.0 ABV
    proof_match = re.search(r"(\d+(?:\.\d+)?)\s*proof", s, re.IGNORECASE)
    if proof_match:
        return float(proof_match.group(1)) / 2.0
    # Percentage: "45%" or "45.0% Alc./Vol."
    pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", s)
    if pct_match:
        return float(pct_match.group(1))
    return None


def parse_volume_ml(s: str) -> float | None:
    """Parse '750 mL', '1 L', '12 fl oz', etc. into millilitres."""
    # mL first — must check before L to avoid ambiguity with "mL" matching the L pattern.
    m = _ML_RE.search(s)
    if m:
        return float(m.group(1))
    m = _L_RE.search(s)
    if m:
        return float(m.group(1)) * 1000.0
    m = _FL_OZ_RE.search(s)
    if m:
        return float(m.group(1)) * _FL_OZ_TO_ML
    m = _OZ_RE.search(s)
    if m:
        return float(m.group(1)) * _FL_OZ_TO_ML
    return None


def standardize_country(s: str) -> str:
    """Normalize country of origin; USA ≡ United States ≡ U.S.A. → 'UNITED STATES'."""
    key = re.sub(r"\s+", " ", s.strip().lower())
    return _COUNTRY_ALIASES.get(key, s.strip().upper())


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _is_low_confidence(s: str | None) -> bool:
    """Return True if the extracted value is the LOW_CONFIDENCE sentinel."""
    return s == _LOW_CONFIDENCE_SENTINEL


def _make_field_result(
    status: FieldStatus,
    extracted_value: str | None,
    application_value: str,
    note: str | None = None,
) -> FieldResult:
    """Construct a FieldResult with region_crop=None (Phase 4 adds cropping)."""
    return FieldResult(
        status=status,
        extracted_value=extracted_value,
        application_value=application_value,
        region_crop=None,
        note=note,
    )


def _infer_beverage_class(class_or_type: str) -> str:
    """Return 'malt', 'wine', or 'distilled_spirits' from the class/type text."""
    lower = class_or_type.lower()
    if any(t in lower for t in _MALT_TERMS):
        return "malt"
    if any(t in lower for t in _WINE_TERMS):
        return "wine"
    return "distilled_spirits"


# ---------------------------------------------------------------------------
# Per-field comparison functions
# ---------------------------------------------------------------------------


def compare_brand_name(extracted: str | None, application: str) -> FieldResult:
    """Case- and punctuation-insensitive equality for brand name."""
    if extracted is None:
        return _make_field_result("FLAG", None, application, "Field not found on label.")
    if _is_low_confidence(extracted):
        return _make_field_result("LOW_CONFIDENCE", extracted, application, _LOW_CONF_NOTE)
    if normalize_for_brand(extracted) == normalize_for_brand(application):
        return _make_field_result("PASS", extracted, application)
    return _make_field_result(
        "FLAG", extracted, application, "Brand name does not match application."
    )


def compare_class_or_type(extracted: str | None, application: str) -> FieldResult:
    """Application's class designation must appear in the extracted text (case-insensitive)."""
    if extracted is None:
        return _make_field_result("FLAG", None, application, "Field not found on label.")
    if _is_low_confidence(extracted):
        return _make_field_result("LOW_CONFIDENCE", extracted, application, _LOW_CONF_NOTE)
    ext_lower = extracted.lower()
    app_lower = application.lower()
    if app_lower in ext_lower or ext_lower == app_lower:
        return _make_field_result("PASS", extracted, application)
    return _make_field_result(
        "FLAG", extracted, application, "Class/type does not match application."
    )


def compare_alcohol_content(
    extracted: str | None, application: str, class_or_type: str
) -> FieldResult:
    """Numeric ABV comparison with tolerance based on beverage class.

    Tolerances per TTB:
    - Malt beverages: ±0.3%
    - Wine ≥7% ABV: ±1.5%
    - Distilled spirits: exact (±0.01% to accommodate float representation)
    """
    if extracted is None:
        return _make_field_result("FLAG", None, application, "Field not found on label.")
    if _is_low_confidence(extracted):
        return _make_field_result("LOW_CONFIDENCE", extracted, application, _LOW_CONF_NOTE)

    ext_abv = parse_abv(extracted)
    app_abv = parse_abv(application)

    if ext_abv is None:
        return _make_field_result(
            "FLAG", extracted, application, f"Could not parse ABV from label text: {extracted!r}"
        )
    if app_abv is None:
        logger.warning("Could not parse ABV from application data: %r", application)
        return _make_field_result(
            "FLAG",
            extracted,
            application,
            f"Could not parse ABV from application data: {application!r}",
        )

    bev_class = _infer_beverage_class(class_or_type)
    if bev_class == "malt":
        tolerance = 0.3
    elif bev_class == "wine" and app_abv >= 7.0:
        tolerance = 1.5
    else:
        # Distilled spirits (and edge cases like low-ABV wine): exact.
        tolerance = 0.01

    if abs(ext_abv - app_abv) <= tolerance:
        return _make_field_result("PASS", extracted, application)
    return _make_field_result(
        "FLAG",
        extracted,
        application,
        f"ABV mismatch: label {ext_abv:.1f}% vs application {app_abv:.1f}% "
        f"(tolerance ±{tolerance}%)",
    )


def compare_net_contents(extracted: str | None, application: str) -> FieldResult:
    """Normalize both values to mL and compare with a small tolerance for rounding."""
    if extracted is None:
        return _make_field_result("FLAG", None, application, "Field not found on label.")
    if _is_low_confidence(extracted):
        return _make_field_result("LOW_CONFIDENCE", extracted, application, _LOW_CONF_NOTE)

    ext_ml = parse_volume_ml(extracted)
    app_ml = parse_volume_ml(application)

    if ext_ml is None:
        return _make_field_result(
            "FLAG", extracted, application, f"Could not parse volume from label text: {extracted!r}"
        )
    if app_ml is None:
        logger.warning("Could not parse volume from application data: %r", application)
        return _make_field_result(
            "FLAG",
            extracted,
            application,
            f"Could not parse volume from application data: {application!r}",
        )

    # ±1.0 mL tolerance covers fl oz ↔ mL conversion rounding (e.g. 355 mL ≈ 12 fl oz).
    if abs(ext_ml - app_ml) <= 1.0:
        return _make_field_result("PASS", extracted, application)
    return _make_field_result(
        "FLAG",
        extracted,
        application,
        f"Net contents mismatch: label {ext_ml:.1f} mL vs application {app_ml:.1f} mL",
    )


def compare_bottler_name_and_address(extracted: str | None, application: str) -> FieldResult:
    """Application's bottler text must appear in the extracted text after normalization."""
    if extracted is None:
        return _make_field_result("FLAG", None, application, "Field not found on label.")
    if _is_low_confidence(extracted):
        return _make_field_result("LOW_CONFIDENCE", extracted, application, _LOW_CONF_NOTE)
    norm_ext = normalize_for_brand(extracted)
    norm_app = normalize_for_brand(application)
    if norm_app in norm_ext:
        return _make_field_result("PASS", extracted, application)
    return _make_field_result(
        "FLAG", extracted, application, "Bottler name/address not found in label text."
    )


def compare_country_of_origin(extracted: str | None, application: str) -> FieldResult:
    """Case-insensitive equality after standardizing common country name variants."""
    if extracted is None:
        return _make_field_result("FLAG", None, application, "Field not found on label.")
    if _is_low_confidence(extracted):
        return _make_field_result("LOW_CONFIDENCE", extracted, application, _LOW_CONF_NOTE)
    if standardize_country(extracted) == standardize_country(application):
        return _make_field_result("PASS", extracted, application)
    return _make_field_result(
        "FLAG", extracted, application, "Country of origin does not match application."
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def verify_label(extracted: ExtractedLabel, application: ApplicationData) -> VerificationResult:
    """Run Stage 2 deterministic comparison and return the full VerificationResult."""
    fields: dict[str, FieldResult] = {
        "brand_name": compare_brand_name(extracted.brand_name, application.brand_name),
        "class_or_type": compare_class_or_type(extracted.class_or_type, application.class_or_type),
        "alcohol_content": compare_alcohol_content(
            extracted.alcohol_content,
            application.alcohol_content,
            application.class_or_type,
        ),
        "net_contents": compare_net_contents(extracted.net_contents, application.net_contents),
        "bottler_name_and_address": compare_bottler_name_and_address(
            extracted.bottler_name_and_address, application.bottler_name_and_address
        ),
        "country_of_origin": compare_country_of_origin(
            extracted.country_of_origin, application.country_of_origin
        ),
    }

    government_warning = check_government_warning(extracted.government_warning)

    pass_count = sum(1 for f in fields.values() if f.status == "PASS")
    flag_count = sum(1 for f in fields.values() if f.status == "FLAG")
    low_count = sum(1 for f in fields.values() if f.status == "LOW_CONFIDENCE")

    return VerificationResult(
        extracted=extracted,
        fields=fields,
        government_warning=government_warning,
        summary=VerificationSummary(
            pass_count=pass_count,
            flag_count=flag_count,
            low_confidence_count=low_count,
            # Two or more LOW_CONFIDENCE fields → full manual review (Phase 5 also enforces this).
            requires_full_manual_review=low_count >= 2,
        ),
    )
