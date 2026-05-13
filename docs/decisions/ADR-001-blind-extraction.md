# ADR-001: The model never sees the application data

**Status:** Accepted

## The situation

When a TTB reviewer uploads a label image, they also fill in what the COLA application claims — the brand name, ABV, net contents, and so on. The obvious thing to do is hand the AI both the image and the application data and ask it to check whether they match.

I didn't do that.

## What we decided

The vision model receives only the label image. It has no idea what the application data says. It just reads what's printed on the label and returns it. A separate, deterministic Python function does the comparison afterward.

## Why

If you show the model the "right answer" before asking it to read the label, you introduce anchoring bias. The model will be tempted to find what it's looking for — and it might. Even if the label actually says something different. That's the exact failure mode that makes an automated compliance tool dangerous rather than helpful.

Keeping them separate means the extraction is honest. If the label says "6.2% ALC./VOL." and the application says "6.5%", the model reports "6.2%" and Python flags the delta. The model didn't know there was a delta to hide.

It also makes the system easier to audit. Anyone can read the extraction prompt — it's a plain text file in `docs/prompts/` — and confirm it contains no application data. You don't have to trust the code to trust the result.

## What we gave up

A single-pass approach (one AI call that reads and compares) would be simpler to build and slightly faster. I traded that simplicity for auditability and resistance to the most likely failure mode in a compliance context.
