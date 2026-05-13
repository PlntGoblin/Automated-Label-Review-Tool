# ADR-004: Fuzzy matching for the Government Warning

**Status:** Accepted (threshold needs validation)

## The situation

The Government Warning is the one field where TTB specifies the exact required text, word for word, under 27 CFR § 16.21. You'd think this would be the easiest field to verify — just check if the extracted text matches the canonical text exactly.

In practice it's the hardest.

## The problem with exact matching

Government warnings are often printed sideways on cans, in very small type, at the edge of the label. The vision model reads them reasonably well most of the time, but introduces small errors: a word gets garbled, a clause number gets dropped, the line breaks get collapsed differently. An exact match check turns these into false flags on labels that are actually compliant.

I saw this live during testing. A can with a perfectly printed, fully compliant warning failed because the model read "ALCOHOLIC BETS" instead of "ALCOHOLIC BEVERAGES" — one word garbled in a sideways text block.

## What we decided

I use a similarity score (Python's `difflib.SequenceMatcher`) to compare the extracted text against the canonical text:

- **Exact match (case-insensitive):** PASS. All-caps warnings are legally equivalent to mixed-case.
- **≥ 82% similar:** LOW_CONFIDENCE. The text is close enough that the mismatch is likely an OCR/orientation issue, not a real violation. Surface it to the reviewer with an explanation.
- **< 82% similar:** FLAG. The text is genuinely different — truncated, altered, or unreadable.

I also added a targeted re-extraction pass: if the warning bbox is taller than it is wide (meaning it's printed sideways), we crop that region, rotate it 90°, and send just that crop back to the model to re-read. If the re-read is better, we use it.

## The honest caveat on 82%

The 82% threshold is an educated starting point, not a validated number. It came from testing on a small handful of real labels and asking: where does the similarity score land on known-good warnings with minor OCR errors vs. genuinely altered text?

To do this properly, you'd want 200–500 labeled examples — some with compliant warnings, some with real violations, some with degraded print — and find the threshold that minimizes false positives without missing real violations. I don't have that corpus yet.

This is the number I'd most want to revisit with real data.
