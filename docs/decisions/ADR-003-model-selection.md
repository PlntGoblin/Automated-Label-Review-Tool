# ADR-003: Why we're using Claude Sonnet

**Status:** Accepted (revisit at scale)

## The situation

Anthropic's model lineup gives us a few options: Haiku (fast and cheap), Sonnet (balanced), and Opus (most capable, slowest). For a tool where the primary job is reading text off a label image and returning structured JSON, the choice isn't obvious.

## What we decided

Claude Sonnet 4.6 for the prototype.

## Why

We tested Haiku early on. It's faster and cheaper, but it struggled on two things that matter a lot here: reading text that's printed sideways on a label, and correctly ignoring decorative or marketing text when extracting regulated fields like brand name. Sonnet handles both noticeably better.

Opus adds capability we don't need. Label reading is a literal extraction task — there's no reasoning, no ambiguity resolution, no synthesis required. Opus would be slower and more expensive without improving the output.

Sonnet hits the sweet spot: reliable enough on edge cases, fast enough to stay under a 5-second target for single-label review, and cheap enough to run in a prototype budget.

## What we'd revisit

If we got access to a real TTB label corpus and could measure accuracy at scale, we might find that Haiku performs within acceptable tolerance on most label types. The cost difference is significant at volume. The right answer is data, not intuition — and we don't have that data yet.

For now, Sonnet is the conservative choice. It's easier to loosen constraints later than to explain accuracy regressions.
