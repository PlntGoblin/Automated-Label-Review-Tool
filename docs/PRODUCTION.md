# Production Notes

ALRT is a prototype. This document lists the production work that should happen before a real compliance deployment.

## Required Production Additions

1. **Validation corpus**

   Build a labeled set of historical COLA applications and label images, stratified by beverage type, image quality, and label complexity. Measure precision and recall per field before procurement or rollout.

2. **Authentication**

   Integrate with Treasury SSO, likely through existing PIV/CAC-backed identity infrastructure.

3. **Audit logging**

   Persist each review event:

   - submitted application data
   - extracted model JSON
   - deterministic comparison result
   - reviewer final disposition
   - label image hash
   - timestamps and user identity

4. **Deployment boundary**

   The prototype uses the public Anthropic API. Production should use a FedRAMP-authorized path or a self-hosted model inside the Treasury boundary.

5. **Data retention policy**

   Define retention and deletion rules for uploaded labels, extracted data, audit logs, and generated crops.

6. **COLA integration**

   Integrate with the existing COLA workflow rather than requiring duplicate data entry.

7. **Section 508 conformance package**

   Automated axe-core checks are included, but production needs manual ANDI, NVDA/JAWS, keyboard-only testing, and a formal ACR/VPAT-style review.

## Deployment Options

### Self-hosted VLM

Run a smaller vision-language model inside Azure Government or AWS GovCloud. This keeps label imagery inside the agency boundary and may simplify security review.

### FedRAMP-authorized hosted inference

Use an authorized hosted model endpoint where available. The ALRT design keeps the prompt and JSON contract isolated enough that the model provider can be swapped behind the `vision.py` client boundary.

### Multi-vendor path

Keep the extraction prompt and response schema model-agnostic. Add a provider interface once there is a real need to compare Claude, GPT, Gemini, or self-hosted options against the same validation corpus.

## Performance Plan

The target user experience is sub-5-second single-label review. Before optimizing further, collect repeatable measurements:

- original upload size
- normalized upload size
- model extraction latency
- deterministic verification latency
- crop generation latency
- total request latency
- provider and model name
- hosting tier

The backend already logs core stage timings. A small benchmark script against representative labels would be the next engineering step.

Likely tuning levers:

- model choice
- max output tokens
- image normalization format and quality
- crop generation policy
- hosting tier
- provider region
- warm instance configuration

## Security Posture

Current prototype:

- no committed secrets
- environment-variable API key loading
- stateless request handling
- upload type and size validation
- no automatic compliance decision

Production still needs:

- authentication and authorization
- audit logs
- retention controls
- FedRAMP-aligned deployment
- monitoring and alerting
- incident response procedures
