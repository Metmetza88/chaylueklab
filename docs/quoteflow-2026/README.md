# QuoteFlow submission preparation

QuoteFlow turns a customer's item request into a manually verified quotation. It focuses on a problem reported by the shop owner: a two-page request contained 30 items, but an earlier extraction returned only 22. That incident is user-reported context, not an independently audited accuracy benchmark.

## Product choice

| Candidate | Delivery constraint | Decision |
| --- | --- | --- |
| Multi-channel publishing hub | Needs platform approvals, OAuth and live posting integrations before the central promise works | Defer |
| Smoke detection app | Requires validated detection performance and careful false-negative handling | Defer |
| QuoteFlow quotation review | Existing working quotation engine, specific shop problem, measurable row-level acceptance, low operating cost | Build this entry |

The implementation is in the existing `Metmetza88/chaylueklab` repository on `feature/woramet-quoteflow-ready-20261120`, based on `feature/woramet-dojo-mvp-20261113` at `2bd2354c60be57d253c19d928cd9951d44195ced`. Production main is not merged.

App: `ai-money-studio/quote-flow.html`
Editable Figma: https://www.figma.com/design/7wq5q237XdHYnlDwHlye2p

## Verified behavior

- Imports CSV/TSV/TXT, a single-sheet XLSX without formulas or merged cells, DOCX tables, and selectable-text PDFs with the supported column headers on every page.
- Reads all PDF pages (up to 50). A page without a readable supported table blocks finalization of a partial result.
- Preserves all parsed rows. Unknown, incomplete or malformed values must be corrected. The independent expected count and manual review are required. A matching count does not establish semantic correctness.
- Detects candidate duplicate name/quantity/price rows and keeps them pending a separate human decision. It never automatically deduplicates a request.
- Uses integer satang for totals, requires complete seller/customer/reference/date metadata, and resets a row's review after editing.
- Exports CSV, saves JSON drafts and prints a two-page A4 quotation for the 30-row example. Restoring a draft resets all reviews.
- Does not send documents to a server or model API. Asset requests load the app's local dependencies. No cookies, automatic draft retention, account, payment, inventory integration or LINE integration is implemented in this module.

## Validation evidence

`VALIDATION.json` records Chromium 156 checks. All four 30-item fixtures matched all name/quantity/unit/price values and the known total of 75,000 satang. The missing-eight-lines, partial-PDF-page, invalid-money, XLSX-formula, duplicate, stale-input and draft-roundtrip cases were checked. Viewports 360, 390, 430, 768, 1024 and 1440 pixels had no document-level horizontal overflow in the three steps. These are emulated Chromium viewports, not physical iPhone Safari, Windows Edge or WebKit tests.

Run core and repository checks: `node --test tests/*.test.mjs` and `node scripts/build-public-site.mjs`.
For browser checks see `tests/quoteflow.browser.mjs` (Playwright and a local HTTP server required).

## Competition status

The account is registered according to the Dojo connector on 20 November 2026. The public Rules and FAQ were read in the live browser. The selected track is **Build for Business**: problem 30%, working demo 25%, business potential 25%, UX 20%.

Official sources:
- https://www.trydojo.io/hackathons/dojo-ai-hack
- https://www.trydojo.io/hackathons/dojo-ai-hack?tab=rules
- https://www.trydojo.io/hackathons/dojo-ai-hack?tab=faq

Start: 20 November 2026 22:00 Bangkok. Deadline: 23 November 2026 12:59 Bangkok (22 November 23:59 Costa Rica). The Rules allow an existing project and evaluate progress during the event. The FAQ explicitly permits a solution that incorporates AI **or is built with AI assistance**. This module uses AI coding assistance, not runtime AI/OCR.

All work prepared in this session before the start belongs to the **pre-event baseline**. Do not claim it as progress made during the event. Record the starting commit at 22:00 Bangkok and add subsequent evidence in `EVENT-PROGRESS.md`.

The public text describes online participation from LATAM. Eligibility for a participant based in Thailand remains unconfirmed, despite the registered account status. The authenticated submission form, final commercial terms and payout setup have not been inspected or accepted. Submission automatically publishes to Dojo Marketplace, so no final submission has been performed.
