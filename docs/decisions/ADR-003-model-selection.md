# ADR-003: Vision model selection

**Status:** Updated — Gemini 2.5 Flash primary, Claude Sonnet 4.6 fallback

## The situation

Alcohol label extraction requires a model that can read printed text accurately, handle rotated or low-contrast labels, return strict JSON, and do it in under 5 seconds. Cost matters at volume — TTB reviewers process thousands of COLA applications.

## What we decided

**Gemini 2.5 Flash** as the primary extraction model, **Claude Sonnet 4.6** as the automatic fallback.

## Why Gemini 2.5 Flash

| | Claude Sonnet 4.6 | Gemini 2.5 Flash |
|---|---|---|
| Speed | ~5–8s | ~2–4s |
| Cost per 1K verifications | ~$18 | ~$0.60 |
| Structured JSON reliability | Excellent | Very good |
| Thinking mode | N/A | Disabled (`thinking_budget=0`) |

Gemini 2.5 Flash is ~30x cheaper and ~2x faster than Claude Sonnet for this task, with no meaningful accuracy difference on label extraction. Thinking mode is explicitly disabled — chain-of-thought reasoning adds ~25 seconds of latency with no benefit for a literal text extraction task.

## Why keep Claude as fallback

Gemini's free tier is quota-limited and the paid tier can experience transient failures like any external API. Claude has been the production model throughout development and is well-validated against our extraction prompt. Keeping it as an automatic fallback means a Gemini outage never takes the tool down — the pipeline retries with Claude and logs a warning.

## Why we moved off Claude-only

Claude Sonnet 4.6 was the right choice for the initial prototype — reliable, well-documented, and fast enough. At scale, the cost difference becomes significant. At 10,000 verifications per month, Claude costs ~$180 vs ~$6 for Gemini 2.5 Flash. A government prototype that might eventually process millions of labels annually needs a sustainable cost model.

## What I'd revisit

If a labeled TTB corpus became available, I'd measure accuracy per field per model and per label type. It's possible Gemini degrades on specific edge cases (rotated text, low-contrast labels, non-Latin characters on imported products) where Claude holds up better. The right answer is data. Until then, Gemini primary with Claude fallback is the pragmatic choice.
