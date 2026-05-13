"""Unit tests for warning_check.py and the canonical 27 CFR § 16.21 constant."""


from app.canonical import CANONICAL_WARNING_TEXT
from app.schemas import WarningExtraction
from app.warning_check import check_government_warning, normalize_for_warning

# ---------------------------------------------------------------------------
# Canonical constant tests
# ---------------------------------------------------------------------------


def test_canonical_warning_text_matches_regulation() -> None:
    """The constant must verbatim match 27 CFR § 16.21(a)(2).

    The expected string is typed independently here so any accidental edit
    to canonical.py causes this test to fail.
    """
    expected = (
        "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not "
        "drink alcoholic beverages during pregnancy because of the risk of birth "
        "defects. (2) Consumption of alcoholic beverages impairs your ability to "
        "drive a car or operate machinery, and may cause health problems."
    )
    assert CANONICAL_WARNING_TEXT == expected


def test_canonical_warning_starts_with_government_warning() -> None:
    """Regulatory text must begin with 'GOVERNMENT WARNING:' in all caps."""
    assert CANONICAL_WARNING_TEXT.startswith("GOVERNMENT WARNING:")


def test_canonical_warning_contains_both_numbered_clauses() -> None:
    """Both numbered clauses must be present — (1) Surgeon General, (2) impairs."""
    assert "(1)" in CANONICAL_WARNING_TEXT
    assert "(2)" in CANONICAL_WARNING_TEXT
    assert "Surgeon General" in CANONICAL_WARNING_TEXT
    assert "impairs your ability" in CANONICAL_WARNING_TEXT


# ---------------------------------------------------------------------------
# normalize_for_warning
# ---------------------------------------------------------------------------


def test_normalize_collapses_whitespace() -> None:
    assert normalize_for_warning("foo  bar\t\nbaz") == "foo bar baz"


def test_normalize_strips_edges() -> None:
    assert normalize_for_warning("  hello  ") == "hello"


def test_normalize_applies_nfc() -> None:
    # Precomposed vs decomposed 'é' — NFC should unify them.
    precomposed = "\xe9"  # é as single codepoint
    decomposed = "e\u0301"  # e + combining acute
    assert normalize_for_warning(decomposed) == normalize_for_warning(precomposed)


# ---------------------------------------------------------------------------
# check_government_warning — missing warning
# ---------------------------------------------------------------------------


def _make_warning(verbatim: str | None, **kwargs) -> WarningExtraction:
    return WarningExtraction(
        verbatim_text=verbatim,
        is_all_caps=kwargs.get("is_all_caps"),
        is_bold=kwargs.get("is_bold"),
        is_continuous_paragraph=kwargs.get("is_continuous_paragraph"),
        bbox=None,
    )


def test_missing_warning_is_flagged() -> None:
    result = check_government_warning(_make_warning(None))
    assert result.status == "FLAG"
    assert result.extracted_text is None
    assert result.canonical_text == CANONICAL_WARNING_TEXT


# ---------------------------------------------------------------------------
# check_government_warning — exact match
# ---------------------------------------------------------------------------


def test_exact_canonical_match_passes() -> None:
    result = check_government_warning(_make_warning(CANONICAL_WARNING_TEXT))
    assert result.status == "PASS"
    assert result.extracted_text == CANONICAL_WARNING_TEXT


def test_whitespace_variant_passes() -> None:
    """Extra internal spaces and a trailing newline should normalize to a match."""
    padded = CANONICAL_WARNING_TEXT.replace("  ", "   ") + "\n"
    result = check_government_warning(_make_warning(padded))
    assert result.status == "PASS"


def test_leading_trailing_whitespace_passes() -> None:
    """Leading/trailing whitespace must not cause a mismatch."""
    result = check_government_warning(_make_warning(f"  {CANONICAL_WARNING_TEXT}  "))
    assert result.status == "PASS"


def test_crlf_line_endings_pass() -> None:
    """Windows-style CRLF line endings inside the warning text normalize to a match."""
    with_crlf = CANONICAL_WARNING_TEXT.replace(" ", "  ").replace("  ", " \r\n")
    result = check_government_warning(_make_warning(with_crlf))
    assert result.status == "PASS"


# ---------------------------------------------------------------------------
# check_government_warning — mismatches → FLAG
# ---------------------------------------------------------------------------


def test_lowercase_warning_passes_text_check() -> None:
    """Lowercase canonical text matches case-insensitively — content is correct.

    TTB does not mandate uppercase in 27 CFR § 16.21; prominence is tracked
    separately via is_all_caps. A fully lowercase warning PASSes the text
    comparison; the reviewer sees is_all_caps=False as a separate signal.
    """
    result = check_government_warning(_make_warning(CANONICAL_WARNING_TEXT.lower()))
    assert result.status == "PASS"


def test_missing_parenthetical_numbers_is_low_confidence() -> None:
    """Dropping '(1)' or '(2)' gives ≥82% similarity — LOW_CONFIDENCE, not FLAG."""
    truncated = CANONICAL_WARNING_TEXT.replace("(1) ", "").replace("(2) ", "")
    result = check_government_warning(_make_warning(truncated))
    assert result.status == "LOW_CONFIDENCE"


def test_extra_punctuation_is_low_confidence() -> None:
    """Adding '!!' at the end gives ≥82% similarity — LOW_CONFIDENCE, not FLAG."""
    modified = CANONICAL_WARNING_TEXT + "!!"
    result = check_government_warning(_make_warning(modified))
    assert result.status == "LOW_CONFIDENCE"


def test_truncated_warning_is_flagged() -> None:
    """A truncated warning (e.g. first sentence only) must FLAG."""
    truncated = CANONICAL_WARNING_TEXT[:80]
    result = check_government_warning(_make_warning(truncated))
    assert result.status == "FLAG"


def test_paraphrased_warning_is_low_confidence() -> None:
    """Minor wording changes give ≥82% similarity — LOW_CONFIDENCE, reviewer must verify."""
    paraphrased = CANONICAL_WARNING_TEXT.replace("Surgeon General", "Surgeon General's Office")
    result = check_government_warning(_make_warning(paraphrased))
    assert result.status == "LOW_CONFIDENCE"


# ---------------------------------------------------------------------------
# check_government_warning — visual properties are informational only
# ---------------------------------------------------------------------------


def test_visual_properties_do_not_flip_pass_to_flag() -> None:
    """is_all_caps=False must not change a text-match PASS to FLAG."""
    result = check_government_warning(
        _make_warning(CANONICAL_WARNING_TEXT, is_all_caps=False, is_bold=False)
    )
    assert result.status == "PASS"
    assert result.is_all_caps is False
    assert result.is_bold is False


def test_visual_properties_preserved_in_result() -> None:
    result = check_government_warning(
        _make_warning(CANONICAL_WARNING_TEXT, is_all_caps=True, is_bold=True, is_continuous_paragraph=True)
    )
    assert result.is_all_caps is True
    assert result.is_bold is True
    assert result.is_continuous_paragraph is True


def test_visual_properties_preserved_on_flag() -> None:
    """Visual property fields are populated even when the text FLAGs."""
    completely_wrong = "This product may be hazardous to your health."
    result = check_government_warning(
        _make_warning(completely_wrong, is_all_caps=False)
    )
    assert result.status == "FLAG"
    assert result.is_all_caps is False


# ---------------------------------------------------------------------------
# check_government_warning — region_crop is always None in Phase 3
# ---------------------------------------------------------------------------


def test_region_crop_is_none_before_phase_4() -> None:
    result = check_government_warning(_make_warning(CANONICAL_WARNING_TEXT))
    assert result.region_crop is None
