# ADR-005: The tool flags, the reviewer decides

**Status:** Accepted

## The situation

It would be technically possible to build ALRT to return a binary APPROVED / DENIED verdict. The model reads the label, the comparison runs, everything passes, the system approves it automatically.

We didn't do that either.

## What we decided

ALRT has three result states: PASS, FLAG, and LOW_CONFIDENCE. There is no FAIL. There is no automatic denial. A human reviewer sees the results and makes the compliance call.

Reviewers can also override any FLAG or LOW_CONFIDENCE result — entering their initials and a reason — which moves it to the passed section. The override is visible in the UI.

## Why

Two reasons, one practical and one principled.

The practical reason: the model is not perfectly accurate. We've seen it garble sideways text, miss fields that are printed in unusual positions, and occasionally conflate a product name with a brand name. Accuracy is good enough to be genuinely useful as a first pass — it's not good enough to make binding compliance decisions without a human checkpoint.

The principled reason: TTB compliance decisions have real consequences for real businesses. An automated denial based on an OCR misread is not a minor inconvenience. Until we have validated accuracy data against a real historical corpus, the right posture is to give the reviewer better information, not to replace the reviewer.

The override system exists for the same reason. LOW_CONFIDENCE means "the system isn't sure" — it doesn't mean the label is wrong. A reviewer who can see the physical label and confirm it's compliant should be able to clear that result and sign their name to it. That's an audit trail, not a workaround.

## What changes this decision

If we had validated accuracy at or above TTB's own inter-rater reliability on a large label corpus, and if the legal and policy framework supported automated decisions, this could be revisited. We're not there yet and the prototype doesn't pretend otherwise.
