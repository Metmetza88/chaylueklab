# WORAMET AI LAB — Dojo preparation (NOT SUBMITTED)

Repository: Metmetza88/chaylueklab  
Prototype branch: feature/woramet-dojo-mvp-20261113  
App: ai-money-studio/business-insights.html

## Confirmed facts (13 November 2026)
- Dojo AI Hackathon: registration confirmed via Dojo connection; team "WORAMET AI LAB" previously displayed.
- Competition runs 20 Nov 2026 at 22:00 through 23 Nov 2026 at 12:59 (Thailand time).
- Dojo currently describes 2 tracks and USD 1,000 total prizes, and 85% creator share of Marketplace sales; this is NOT guaranteed income.
- The Dojo summary does NOT confirm whether using pre-built code, a pre-event prototype, or an existing project is eligible. **Get written organizer approval before reusing the prototype as a competition submission.**

## Product and limitations
Working title: WORAMET AI LAB — Business Insights for Small Stores.

Current prototype:
- Upload or paste a CSV file to analyze sales locally in the user's browser.
- Display totals, units, number of rows, and top selling products.
- Produce simple rule-based observations, draft marketing copy, and export a TXT report.
- Accept Thai or English CSV headers as described on the page.
- No API fees. No store login, payments, or real transactions.

IMPORTANT: the tool currently uses deterministic JavaScript calculations and templates, **not a generative AI model**. Do not describe it as having AI-powered analysis until an actual model is connected and tested.

## Demo data (fictional)
Click "ใส่ข้อมูลตัวอย่าง", then "วิเคราะห์ยอดขาย".
Expected result: THB 7,200 total, 12 units, 7 rows, 3 products. All prices in the mock dataset are THB 600 per unit. No personal customer information is needed.

## Run tests (Windows, no extra package)
From the repository root:
node --test ai-money-studio/tests/business-insights.test.cjs

These automated checks cover sample totals, blank prices, invalid quantities, quoted commas, invalid CSV recovery, and clear behavior. Passing these checks does NOT equal a real iPhone/Safari browser test.

## Prepare before event
- [x] Team registered (verified with Dojo connector).
- [x] Prototype isolated from production main branch.
- [x] Prototype sales report and marketing copy reviewed from source.
- [x] Blank price parsing fixed and calculation test cases passed in isolated test harness.
- [ ] Confirm pre-existing-code rules with organizer.
- [ ] Confirm judging rubric, submission fields and Marketplace terms with organizer.
- [ ] Add genuinely useful AI capability securely if permitted: no API keys in browser source.
- [ ] Serve a live preview from a non-production environment; test in Safari on iPhone.
- [ ] Perform accessibility and real-device testing; correct any issues.
- [ ] Record 60-90 second demo video; gather screenshots and working link.
- [ ] Submit from the Dojo project page only after owner review.

## Suggested 75-second demo narrative
0–10s: Introduce the problem: small stores struggle to analyze sales spreadsheets.
10–25s: Click to load fictional sales data.
25–45s: Show THB 7,200 sales, 12 units, top product rankings, and rule-based observations.
45–60s: Show the draft promotion and exported TXT report.
60–75s: Explain value, privacy trade-offs and future secure AI connection (do not claim already implemented).

## Safety
- Do not merge to main, deploy to chaylueklab.com, expose customer data, or connect payment gateways without separate review.
- Use fictional data. No paid API plans required for this prototype.
- This document is a preparation checklist, NOT proof of eligibility or submission.
