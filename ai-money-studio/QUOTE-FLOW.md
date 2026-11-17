# QuoteFlow MVP — WORAMET SmartGuard Suite

**Status:** Working source in the existing experimental branch. NOT DEPLOYED / NOT SUBMITTED.

## Current scope

- A static, privacy-preserving quotation composer in `ai-money-studio/quote-flow.html`.
- Import CSV/TSV/TXT with headings `สินค้า,จำนวน,ราคาต่อหน่วย` or English equivalents. Paste tabular data copied from a document, or add/edit rows manually.
- Explicitly rejects missing or malformed rows. The owner must review all rows before printing.
- All calculations use integer satang. Supports up to 500 items and 512 KiB of UTF-8 input.
- The sample button loads **30 fictional products**, 2 units each at ฿12.50 = 60 units / ฿750.00.
- Sender, recipient, quotation number and date are editable; print is disabled until they are provided and all items validate.
- Browser `window.print()` creates a printable A4 quotation; the user may save the print output to PDF using their device's browser/print controls.
- No file uploads to our server, cookies, database, AI/API call, LINE message or background automation. CSP has `connect-src 'none'`.
- The result is a **quotation**, not a tax invoice. No taxes, discounts, stock checking, signatures or official approval.

## Important limitations

- The MVP **cannot read a PDF or photo automatically**, and it is **not AI OCR**. For a PDF source, copy its table as text into this app or convert the document into CSV separately and verify every row.
- No claim is made that automatic PDF extraction works, that AI is connected, or that results are suitable for issuing a legally complete tax document.
- Print / Save to PDF may behave differently in iOS Safari; no real iPhone device test has been recorded yet.
- Do not enter private customer or school documents before privacy and retention approval; use the synthetic sample for now.

## Developer checks

```sh
node --test tests/quote-flow.test.mjs
node --test tests/*.test.mjs
node scripts/verify-public-site.mjs
```

Manual mobile acceptance test:
1. Open QuoteFlow in a browser from an **authorized local preview** (not deployed to production).
2. Tap **ทดลอง 30 รายการสมมติ** and confirm row count 30 / 60 units / ฿750.00.
3. Change a single quantity from 2 to 3; total should increase by ฿12.50.
4. Enter an invalid price `1.234`; verify the error and the print button disabled.
5. Restore the price; set seller, customer, quote number, date; test Safari print preview / PDF save.
6. Check scrolling and all 30 rows across printed pages; do not confuse a code-view URL with a live app.

## Next implementation gates

1. Owner inspects the source, approves a secure **non-production preview** approach, and tests on iPhone.
2. Evaluate AI/OCR providers, document permission, per-request cost, accuracy and data retention. Add secure server proxy and quota before enabling anything.
3. Test 2+ page PDF with 30 known lines and measure extracted rows, field-level accuracy and subtotal against ground truth.
4. Add ScamShield prototype as a separate reviewed module. Retain the SmokeGuard experiment with safety disclaimer.
5. Verify Dojo eligibility for pre-event code and a multi-module entry before submission.

No main-branch merge, deployment, payments, user-data upload, or Dojo submission is authorized by this document.
