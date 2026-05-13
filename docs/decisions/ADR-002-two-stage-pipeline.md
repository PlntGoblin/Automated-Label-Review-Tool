# ADR-002: Vision does the reading, Python does the judging

**Status:** Accepted

## The situation

Once we decided the model shouldn't see the application data (see ADR-001), I had to figure out where to draw the line between what the AI handles and what code handles.

## What we decided

Stage 1 is entirely the model's job: look at the image, read the text, return structured JSON. Stage 2 is entirely Python's job: take that JSON and compare each field against the application data using deterministic logic.

No AI involvement in Stage 2.

## Why

AI models are excellent at reading images and extracting text. They are less reliable when you ask them to make structured compliance judgments — especially when the rules have specific tolerances (TTB allows ±0.3% ABV for malt beverages, for example) or require exact string matching.

Python is terrible at reading images and excellent at exact comparisons. So I let each do what it's good at.

This also means the comparison logic is fully testable without touching the AI at all. You can write a unit test that passes in extracted fields and application data and confirms the right verdict comes out. The test suite does exactly this — it's fast, deterministic, and has no API dependency.

## What we gave up

The model is often capable of doing simple comparisons correctly. Using it for Stage 2 would reduce the total lines of code. I chose more code and more testability over fewer moving parts.
