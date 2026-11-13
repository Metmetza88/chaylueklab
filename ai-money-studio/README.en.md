# WORAMET AI LAB — Business Insights MVP

A browser-based toolkit for small stores: import sales CSV, understand revenue and best sellers, and prepare a promotional draft. No account, API fees or customer data is required.

**Actual status:** deterministic calculations, rules and templates. Generative AI is **not connected or live-tested**. The server integration boundary is disabled. This is not accounting or point-of-sale software.

[ภาษาไทย](README.md) · [Audit and QA evidence](AUDIT-QA.md) · [Dojo preparation](DOJO-READINESS.md) · [Demo script](DEMO-SCRIPT.md) · [AI boundary](../server/woramet/README.md)

## Run locally

Use the existing `Metmetza88/chaylueklab` repository and `feature/woramet-dojo-mvp-20261113` branch, with Node.js 24 LTS:

```sh
git switch feature/woramet-dojo-mvp-20261113
node server/woramet/dev-server.mjs
```

Open <http://127.0.0.1:4173/ai-money-studio/business-insights.html>. Click the quick fictional-data demo, or choose a CSV and analyze it. Download TXT/JSON reports, copy a template draft or save it as TXT, then clear the page. Ctrl+C stops the preview. No app dependencies need installing.

Fictional fixtures:

| File | Expected result |
| --- | --- |
| `fixtures/sample-sales.csv` | THB 7,200; 12 units; 7 rows; 3 products |
| `fixtures/thai-sales-14-days.csv` | THB 2,100; 21 units; 14 rows; 1 product; +100% across two seven-day periods |

The preview binds only to `127.0.0.1`, serves an explicit static allowlist and does not expose repository/server files. PowerShell users can set `$env:WORAMET_PORT="4174"` if the default port is busy.

## Phone preview (owner approved, 13 November 2026)

[Open the tested mobile preview](https://rawcdn.githack.com/Metmetza88/chaylueklab/8e7ca1c40d2196c748c0320abff640a0affa9bc7/ai-money-studio/business-insights.html). On the provider's first-visit **External Content Notice**, click **Open the page**, then choose the fictional-data quick demo (THB 7,200).

This free third-party static preview serves the immutable public GitHub commit `8e7ca1c` from the existing experimental branch. No new repository or hosting project was created; no billing, main-branch changes or production-domain changes were made. There is no uptime guarantee, and later branch changes do not update this pinned URL. CSV stays in the app's browser memory; AI remains disabled. External Chromium QA passed 375, 390, 430 and 1440-pixel viewports, including Thai CSV import and TXT/JSON downloads. Actual iPhone Safari remains untested.

## Supported data and calculation rules

Required headers: `product` / `สินค้า` / `ชื่อสินค้า`, `quantity` / `qty` / `จำนวน`, `unit_price` / `price` / `ราคาต่อหน่วย` / `ราคา`. English headers are case insensitive; columns can be reordered. Comma, semicolon and tab separators, escaped quotes, Thai digits and correctly grouped thousands are supported.

UTF-8 (with/without BOM) and UTF-16 LE/BE with BOM are detected. Select Windows-874 explicitly for older Thai CSV exports. Invalid encoding is rejected rather than guessed. Commas inside product names or numbers need CSV quotes.

Limits: 2 MB, 10,000 rows, 64 columns; product names at most 160 characters without line breaks/control spoofing. Quantity must be a positive integer up to 10,000,000. Prices are THB 0–100,000,000 with at most two decimals; scientific notation and decimal commas are unsupported. All money is aggregated in integer satang with safe-integer checks. Incorrect rows, ambiguous/duplicate headers and inconsistent column counts reject the analysis; nothing is silently skipped except empty physical lines.

Dates are optional (`date` / `วันที่`): `YYYY-MM-DD`, `YYYY/MM/DD`, **day/month/year** `DD/MM/YYYY` (separators `-` `/` `.`), or month names such as `1 พ.ย. 2569` / `15 Nov 2026`, Gregorian or Buddhist year; numeric day/month is never read as month/day. A trailing local time without timezone is ignored; ISO `T`/`Z`/offset forms are rejected. Prices may carry `฿`, `THB` or `บาท`. When present, every date must be valid. The two seven-day periods are compared only if the latest 14 calendar days represented in the data all have entries. Missing dates are unknown, never assumed zero. A zero previous total produces no percentage. No forecasts are made.

Revenue is quantity × unit price, not profit. Costs, discounts, taxes, fees and returns are not deducted. Negative returns are unsupported. Rows are product line items, not orders. Duplicate rows are retained; product names are normalized to NFC, but spelling variants/SKUs are not automatically matched. Revenue and unit leaders are identified separately; ties are alphabetical.

## Privacy and AI

Insights performs no outbound requests, persistence, tracking or automatic publishing. A restrictive CSP blocks network connections. CSV values are inserted as text. Changed/cleared input and failed/new imports invalidate report snapshots; asynchronous reads cannot overwrite newer data. Reports contain product names and sales totals; store downloaded files privately. Extra input columns are ignored in results but remain visible in the text input until cleared.

Existing repository code contains AI adapters for unrelated LINE, newsroom and image/video features. That does not establish an operational provider for this MVP. No live credentials were inspected or provider requests made. `server/woramet` provides a disabled, dependency-injected integration boundary, not an active model. Future AI requests require owner-approved credentials/budget, verified identity, atomic persistent quotas, consent and a real provider adapter. Test mocks do not prove Generative AI functionality.

## Tests and device limits

```sh
node --test ai-money-studio/tests/*.test.cjs ai-money-studio/tests/*.test.mjs
node --test tests/*.test.mjs
node scripts/verify-public-site.mjs
```

For optional browser QA, install Playwright 1.64.1 in a temporary/local tools directory and its Chromium browser. Set `PLAYWRIGHT_MODULE` to that package directory, then run `node ai-money-studio/tests/business-insights.browser.cjs`. `CHROMIUM_PATH` optionally selects an existing Chromium executable; `WORAMET_QA_DIR` selects evidence output (default: OS temporary directory).

Chromium on Linux passed 320, 375, 390, 430 and 1440-pixel viewports. **Real iPhone Safari and native Windows have not been tested.** WebKit launch was blocked by missing system libraries. Cloud Chromium blocks `file://`; direct-file operation remains unverified. Use the tested local HTTP preview on Windows. Use the owner-approved HTTPS preview above for iPhone access; the computer's loopback URL is not reachable from a phone. No production-domain deployment was made.

## Competition preparation

Proposed track: **Build for Business**, subject to organizer confirmation. The pitch, 60–90 second demo script and submission checklist are drafts. Confirm eligibility of pre-existing code and Marketplace publication/licensing terms in writing before submission. No production deployment, merge to main, paid provider activation or contest submission is authorized by these instructions.
