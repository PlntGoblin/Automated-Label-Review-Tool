"""Canonical regulatory text constants."""

# 27 CFR § 16.21(a)(2) — verbatim statutory Government Warning text.
# This exact string is used for deterministic equality comparison in warning_check.py.
# Do NOT paraphrase or modernize; the regulation specifies exact wording.
CANONICAL_WARNING_TEXT = (
    "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not "
    "drink alcoholic beverages during pregnancy because of the risk of birth "
    "defects. (2) Consumption of alcoholic beverages impairs your ability to "
    "drive a car or operate machinery, and may cause health problems."
)
