"""Unit tests for verification.py — per-field comparison rules and orchestrator."""

import pytest

from app.canonical import CANONICAL_WARNING_TEXT
from app.schemas import ApplicationData, ExtractedLabel, WarningExtraction
from app.verification import (
    _infer_beverage_class,
    compare_alcohol_content,
    compare_bottler_name_and_address,
    compare_brand_name,
    compare_class_or_type,
    compare_country_of_origin,
    compare_net_contents,
    normalize_for_brand,
    parse_abv,
    parse_volume_ml,
    standardize_country,
    verify_label,
)

# ---------------------------------------------------------------------------
# normalize_for_brand
# ---------------------------------------------------------------------------


def test_normalize_brand_lowercases() -> None:
    assert normalize_for_brand("HELLO") == "hello"


def test_normalize_brand_strips_punctuation() -> None:
    assert normalize_for_brand("STONE'S THROW") == "stones throw"


def test_normalize_brand_collapses_whitespace() -> None:
    assert normalize_for_brand("OLD  TOM") == "old tom"


def test_normalize_brand_strips_edges() -> None:
    assert normalize_for_brand("  foo  ") == "foo"


# ---------------------------------------------------------------------------
# parse_abv
# ---------------------------------------------------------------------------


def test_parse_abv_percentage() -> None:
    assert parse_abv("45% Alc./Vol.") == pytest.approx(45.0)


def test_parse_abv_integer_percentage() -> None:
    assert parse_abv("12%") == pytest.approx(12.0)


def test_parse_abv_decimal_percentage() -> None:
    assert parse_abv("5.0% Alc./Vol.") == pytest.approx(5.0)


def test_parse_abv_proof() -> None:
    assert parse_abv("90 Proof") == pytest.approx(45.0)


def test_parse_abv_proof_case_insensitive() -> None:
    assert parse_abv("90 PROOF") == pytest.approx(45.0)


def test_parse_abv_returns_none_on_unparseable() -> None:
    assert parse_abv("forty-five percent") is None


# ---------------------------------------------------------------------------
# parse_volume_ml
# ---------------------------------------------------------------------------


def test_parse_volume_ml_milliliters() -> None:
    assert parse_volume_ml("750 mL") == pytest.approx(750.0)


def test_parse_volume_ml_liters() -> None:
    assert parse_volume_ml("1 L") == pytest.approx(1000.0)


def test_parse_volume_ml_liters_decimal() -> None:
    assert parse_volume_ml("1.5 L") == pytest.approx(1500.0)


def test_parse_volume_ml_fl_oz() -> None:
    assert parse_volume_ml("12 fl oz") == pytest.approx(12 * 29.5735)


def test_parse_volume_ml_fl_oz_with_periods() -> None:
    assert parse_volume_ml("12 fl. oz.") == pytest.approx(12 * 29.5735)


def test_parse_volume_ml_case_insensitive() -> None:
    assert parse_volume_ml("750 ML") == pytest.approx(750.0)


def test_parse_volume_ml_no_space() -> None:
    assert parse_volume_ml("750mL") == pytest.approx(750.0)


def test_parse_volume_ml_returns_none_on_unparseable() -> None:
    assert parse_volume_ml("one bottle") is None


# ---------------------------------------------------------------------------
# standardize_country
# ---------------------------------------------------------------------------


def test_standardize_usa() -> None:
    assert standardize_country("USA") == "UNITED STATES"


def test_standardize_us_a_dotted() -> None:
    assert standardize_country("U.S.A.") == "UNITED STATES"


def test_standardize_united_states() -> None:
    assert standardize_country("United States") == "UNITED STATES"


def test_standardize_united_states_of_america() -> None:
    assert standardize_country("United States of America") == "UNITED STATES"


def test_standardize_unknown_country_uppercased() -> None:
    assert standardize_country("France") == "FRANCE"


def test_standardize_case_insensitive_lookup() -> None:
    assert standardize_country("usa") == "UNITED STATES"


# ---------------------------------------------------------------------------
# _infer_beverage_class
# ---------------------------------------------------------------------------


def test_infer_malt_beer() -> None:
    assert _infer_beverage_class("American Lager") == "malt"


def test_infer_malt_ale() -> None:
    assert _infer_beverage_class("India Pale Ale") == "malt"


def test_infer_wine() -> None:
    assert _infer_beverage_class("Chardonnay Wine") == "wine"


def test_infer_distilled_spirits_bourbon() -> None:
    assert _infer_beverage_class("Kentucky Straight Bourbon Whiskey") == "distilled_spirits"


def test_infer_distilled_spirits_vodka() -> None:
    assert _infer_beverage_class("Vodka") == "distilled_spirits"


# ---------------------------------------------------------------------------
# compare_brand_name
# ---------------------------------------------------------------------------


def test_brand_name_exact_match_passes() -> None:
    result = compare_brand_name("Old Tom Distillery", "Old Tom Distillery")
    assert result.status == "PASS"


def test_brand_name_case_insensitive_passes() -> None:
    result = compare_brand_name("OLD TOM DISTILLERY", "Old Tom Distillery")
    assert result.status == "PASS"


def test_brand_name_punctuation_insensitive_passes() -> None:
    result = compare_brand_name("STONE'S THROW", "Stone's Throw")
    assert result.status == "PASS"


def test_brand_name_mismatch_flags() -> None:
    result = compare_brand_name("Wrong Brand", "Old Tom Distillery")
    assert result.status == "FLAG"


def test_brand_name_none_flags() -> None:
    result = compare_brand_name(None, "Old Tom Distillery")
    assert result.status == "FLAG"
    assert result.extracted_value is None


def test_brand_name_low_confidence_sentinel() -> None:
    result = compare_brand_name("LOW_CONFIDENCE", "Old Tom Distillery")
    assert result.status == "LOW_CONFIDENCE"


# ---------------------------------------------------------------------------
# compare_class_or_type
# ---------------------------------------------------------------------------


def test_class_or_type_exact_passes() -> None:
    result = compare_class_or_type("Kentucky Straight Bourbon Whiskey", "Kentucky Straight Bourbon Whiskey")
    assert result.status == "PASS"


def test_class_or_type_substring_passes() -> None:
    """Application value is a substring of the extracted label text."""
    result = compare_class_or_type(
        "Kentucky Straight Bourbon Whiskey, Aged 12 Years",
        "Kentucky Straight Bourbon Whiskey",
    )
    assert result.status == "PASS"


def test_class_or_type_case_insensitive_passes() -> None:
    result = compare_class_or_type("kentucky straight bourbon whiskey", "Kentucky Straight Bourbon Whiskey")
    assert result.status == "PASS"


def test_class_or_type_mismatch_flags() -> None:
    result = compare_class_or_type("American Vodka", "Kentucky Straight Bourbon Whiskey")
    assert result.status == "FLAG"


def test_class_or_type_none_flags() -> None:
    result = compare_class_or_type(None, "Kentucky Straight Bourbon Whiskey")
    assert result.status == "FLAG"


def test_class_or_type_low_confidence() -> None:
    result = compare_class_or_type("LOW_CONFIDENCE", "Kentucky Straight Bourbon Whiskey")
    assert result.status == "LOW_CONFIDENCE"


# ---------------------------------------------------------------------------
# compare_alcohol_content
# ---------------------------------------------------------------------------


def test_abv_exact_distilled_spirits_passes() -> None:
    result = compare_alcohol_content("45% Alc./Vol.", "45% Alc./Vol.", "Bourbon Whiskey")
    assert result.status == "PASS"


def test_abv_within_malt_tolerance_passes() -> None:
    result = compare_alcohol_content("5.1% Alc./Vol.", "5.0% Alc./Vol.", "American Lager Beer")
    assert result.status == "PASS"


def test_abv_outside_malt_tolerance_flags() -> None:
    result = compare_alcohol_content("5.5% Alc./Vol.", "5.0% Alc./Vol.", "American Lager Beer")
    assert result.status == "FLAG"


def test_abv_within_wine_tolerance_passes() -> None:
    result = compare_alcohol_content("13.0% Alc./Vol.", "12.0% Alc./Vol.", "Chardonnay Wine")
    assert result.status == "PASS"


def test_abv_outside_wine_tolerance_flags() -> None:
    result = compare_alcohol_content("14.0% Alc./Vol.", "12.0% Alc./Vol.", "Chardonnay Wine")
    assert result.status == "FLAG"


def test_abv_distilled_spirits_mismatch_flags() -> None:
    result = compare_alcohol_content("43% Alc./Vol.", "45% Alc./Vol.", "Kentucky Straight Bourbon Whiskey")
    assert result.status == "FLAG"


def test_abv_proof_conversion_passes() -> None:
    result = compare_alcohol_content("90 Proof", "45% Alc./Vol.", "Bourbon Whiskey")
    assert result.status == "PASS"


def test_abv_none_flags() -> None:
    result = compare_alcohol_content(None, "45% Alc./Vol.", "Bourbon Whiskey")
    assert result.status == "FLAG"


def test_abv_low_confidence() -> None:
    result = compare_alcohol_content("LOW_CONFIDENCE", "45% Alc./Vol.", "Bourbon Whiskey")
    assert result.status == "LOW_CONFIDENCE"


def test_abv_unparseable_extracted_flags() -> None:
    result = compare_alcohol_content("forty-five percent", "45% Alc./Vol.", "Bourbon Whiskey")
    assert result.status == "FLAG"
    assert result.note is not None


# ---------------------------------------------------------------------------
# compare_net_contents
# ---------------------------------------------------------------------------


def test_net_contents_same_unit_passes() -> None:
    result = compare_net_contents("750 mL", "750 mL")
    assert result.status == "PASS"


def test_net_contents_liter_to_ml_passes() -> None:
    result = compare_net_contents("1 L", "1000 mL")
    assert result.status == "PASS"


def test_net_contents_fl_oz_to_ml_equivalent_passes() -> None:
    """12 fl oz ≈ 354.9 mL — within rounding tolerance."""
    result = compare_net_contents("12 fl oz", "355 mL")
    assert result.status == "PASS"


def test_net_contents_mismatch_flags() -> None:
    result = compare_net_contents("375 mL", "750 mL")
    assert result.status == "FLAG"


def test_net_contents_none_flags() -> None:
    result = compare_net_contents(None, "750 mL")
    assert result.status == "FLAG"


def test_net_contents_low_confidence() -> None:
    result = compare_net_contents("LOW_CONFIDENCE", "750 mL")
    assert result.status == "LOW_CONFIDENCE"


def test_net_contents_unparseable_extracted_flags() -> None:
    result = compare_net_contents("one bottle", "750 mL")
    assert result.status == "FLAG"
    assert result.note is not None


# ---------------------------------------------------------------------------
# compare_bottler_name_and_address
# ---------------------------------------------------------------------------


def test_bottler_exact_match_passes() -> None:
    result = compare_bottler_name_and_address(
        "Old Tom Distillery, Louisville KY",
        "Old Tom Distillery, Louisville KY",
    )
    assert result.status == "PASS"


def test_bottler_substring_match_passes() -> None:
    """Application value is a substring of the fuller extracted text."""
    result = compare_bottler_name_and_address(
        "Bottled by Old Tom Distillery, Louisville KY 40201",
        "Old Tom Distillery, Louisville KY",
    )
    assert result.status == "PASS"


def test_bottler_case_insensitive_passes() -> None:
    result = compare_bottler_name_and_address(
        "OLD TOM DISTILLERY, LOUISVILLE KY",
        "Old Tom Distillery, Louisville KY",
    )
    assert result.status == "PASS"


def test_bottler_mismatch_flags() -> None:
    result = compare_bottler_name_and_address(
        "Different Distillery, Nashville TN",
        "Old Tom Distillery, Louisville KY",
    )
    assert result.status == "FLAG"


def test_bottler_none_flags() -> None:
    result = compare_bottler_name_and_address(None, "Old Tom Distillery, Louisville KY")
    assert result.status == "FLAG"


def test_bottler_low_confidence() -> None:
    result = compare_bottler_name_and_address("LOW_CONFIDENCE", "Old Tom Distillery, Louisville KY")
    assert result.status == "LOW_CONFIDENCE"


# ---------------------------------------------------------------------------
# compare_country_of_origin
# ---------------------------------------------------------------------------


def test_country_usa_variants_pass() -> None:
    for variant in ("USA", "U.S.A.", "United States", "United States of America", "us"):
        result = compare_country_of_origin(variant, "USA")
        assert result.status == "PASS", f"Expected PASS for {variant!r}"


def test_country_exact_foreign_passes() -> None:
    result = compare_country_of_origin("France", "France")
    assert result.status == "PASS"


def test_country_mismatch_flags() -> None:
    result = compare_country_of_origin("France", "USA")
    assert result.status == "FLAG"


def test_country_none_flags() -> None:
    result = compare_country_of_origin(None, "USA")
    assert result.status == "FLAG"


def test_country_low_confidence() -> None:
    result = compare_country_of_origin("LOW_CONFIDENCE", "USA")
    assert result.status == "LOW_CONFIDENCE"


# ---------------------------------------------------------------------------
# All four status states: PASS, FLAG, LOW_CONFIDENCE, missing-field (None)
# ---------------------------------------------------------------------------


def test_all_four_states_reachable_via_brand_name() -> None:
    """brand_name exercises all four status states."""
    assert compare_brand_name("Old Tom", "Old Tom").status == "PASS"
    assert compare_brand_name("Wrong Name", "Old Tom").status == "FLAG"
    assert compare_brand_name("LOW_CONFIDENCE", "Old Tom").status == "LOW_CONFIDENCE"
    assert compare_brand_name(None, "Old Tom").status == "FLAG"


# ---------------------------------------------------------------------------
# verify_label orchestrator
# ---------------------------------------------------------------------------


def _make_perfect_extraction() -> ExtractedLabel:
    return ExtractedLabel(
        brand_name="Old Tom Distillery",
        class_or_type="Kentucky Straight Bourbon Whiskey",
        alcohol_content="45% Alc./Vol.",
        net_contents="750 mL",
        bottler_name_and_address="Old Tom Distillery, Louisville KY",
        country_of_origin="USA",
        government_warning=WarningExtraction(
            verbatim_text=CANONICAL_WARNING_TEXT,
            is_all_caps=True,
            is_bold=True,
            is_continuous_paragraph=True,
            bbox=None,
        ),
        bboxes={},
    )


def _make_application() -> ApplicationData:
    return ApplicationData(
        brand_name="OLD TOM DISTILLERY",
        class_or_type="Kentucky Straight Bourbon Whiskey",
        alcohol_content="45% Alc./Vol.",
        net_contents="750 mL",
        bottler_name_and_address="Old Tom Distillery, Louisville KY",
        country_of_origin="USA",
    )


def test_verify_label_all_pass() -> None:
    result = verify_label(_make_perfect_extraction(), _make_application())
    assert result.manual_review_required is False
    assert result.error_reason is None
    for name, field in result.fields.items():
        assert field.status == "PASS", f"{name} should be PASS"
    assert result.government_warning.status == "PASS"
    assert result.summary.pass_count == 6
    assert result.summary.flag_count == 0
    assert result.summary.low_confidence_count == 0
    assert result.summary.requires_full_manual_review is False


def test_verify_label_abv_mismatch_flags() -> None:
    extraction = _make_perfect_extraction()
    extraction = extraction.model_copy(update={"alcohol_content": "40% Alc./Vol."})
    result = verify_label(extraction, _make_application())
    assert result.fields["alcohol_content"].status == "FLAG"
    assert result.summary.flag_count >= 1


def test_verify_label_missing_warning_flags() -> None:
    extraction = _make_perfect_extraction()
    extraction = extraction.model_copy(
        update={
            "government_warning": WarningExtraction(
                verbatim_text=None,
                is_all_caps=None,
                is_bold=None,
                is_continuous_paragraph=None,
                bbox=None,
            )
        }
    )
    result = verify_label(extraction, _make_application())
    assert result.government_warning.status == "FLAG"


def test_verify_label_two_low_confidence_triggers_full_review() -> None:
    extraction = _make_perfect_extraction()
    extraction = extraction.model_copy(
        update={
            "brand_name": "LOW_CONFIDENCE",
            "alcohol_content": "LOW_CONFIDENCE",
        }
    )
    result = verify_label(extraction, _make_application())
    assert result.summary.low_confidence_count >= 2
    assert result.summary.requires_full_manual_review is True


def test_verify_label_one_low_confidence_does_not_trigger_full_review() -> None:
    extraction = _make_perfect_extraction()
    extraction = extraction.model_copy(update={"brand_name": "LOW_CONFIDENCE"})
    result = verify_label(extraction, _make_application())
    assert result.summary.low_confidence_count == 1
    assert result.summary.requires_full_manual_review is False


def test_verify_label_all_fields_present_in_result() -> None:
    result = verify_label(_make_perfect_extraction(), _make_application())
    expected_fields = {
        "brand_name",
        "class_or_type",
        "alcohol_content",
        "net_contents",
        "bottler_name_and_address",
        "country_of_origin",
    }
    assert set(result.fields.keys()) == expected_fields


def test_verify_label_region_crop_is_none_before_phase_4() -> None:
    result = verify_label(_make_perfect_extraction(), _make_application())
    for field in result.fields.values():
        assert field.region_crop is None
    assert result.government_warning.region_crop is None
