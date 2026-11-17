# WORAMET AI LAB — SmartGuard Suite (working plan)

Status: DEVELOPMENT ONLY — NOT DEPLOYED, NOT SUBMITTED.
Repository: Metmetza88/chaylueklab
Working branch: feature/woramet-dojo-mvp-20261113 (do not merge to main).

## Existing components (source audited 2026-11-17)

- `ai-money-studio/business-insights.html`: offline CSV analysis, deterministic; not generative AI.
- `ai-money-studio/smoke-guard.html`, `api/smoke-detect.js`: existing smoke-detection experiment; deployment and live inference not verified.
- `server/woramet/ai-boundary.mjs`: disabled AI adapter; do not enable with real customer data.
- QuoteFlow and ScamShield did not exist in the audited branch tree.

## Delivery order

1. QuoteFlow MVP: import pasted CSV/TSV item list or manual rows; strict validation and integer-satang totals; editable review; print/save quotation as PDF using browser print; synthetic 30-row demo.
2. ScamShield: separate opt-in analysis of suspicious quote/message text, never claim 'safe' with certainty.
3. SmokeWatch: integrate existing smoke experiment as an explicitly labeled beta, not a certified fire alarm.

## Gate before any launch

- Do not deploy, configure secrets, use real customer data, send LINE messages, or submit to Dojo without separate owner approval.
- Confirm Dojo permits pre-event code and multi-module submissions; no evidence yet of approval.
- Local calculation is NOT AI OCR. Document/PDF extraction requires an approved provider, privacy/consent, secure backend, budget/quota, and end-to-end test.
- Do not open GitHub Marketplace or Vercel integrations automatically.

## Current milestone

QuoteFlow working demo with 30 synthetic lines and reproducible automated tests.
