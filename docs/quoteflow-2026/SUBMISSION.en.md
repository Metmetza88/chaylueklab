# Copy-ready submission draft

Status: prepared, not submitted. These sections are aligned to the public Rules and FAQ. The exact authenticated form fields have not been verified.

**Project name:** QuoteFlow by WORAMET AI LAB

**Track:** Build for Business

**Tagline:** Review every item before you send a quotation.

**Problem**
Small shops receive item requests in documents and copy them into quotations. A missing line creates an incomplete offer. The project starts from a shop owner's reported incident in which a two-page, 30-item request was reduced to 22 extracted items. That report motivated the product; it is not an independently measured benchmark.

**Solution**
QuoteFlow is a browser-based quotation workspace with three steps: import, verify, and quote. It reads supported CSV, XLSX, DOCX and selectable-text PDF tables locally. The user enters the item count from the original request and verifies each row. Mismatched counts, unreadable PDF pages, invalid amounts and unreviewed lines block final output. Every parsed line retains its source location. Duplicate candidates remain visible for an explicit human decision. Exact satang arithmetic produces the quotation total. Users can print to PDF, export items to CSV and download a JSON draft.

**What works today**
Four synthetic 30-item document fixtures matched all names, quantities, units and prices and totaled THB 750.00. Automated browser checks also covered the known-count mismatch of 22 vs 30, an unreadable PDF page, invalid money, XLSX formulas, duplicates, download/restore, input changes and six viewport widths. Evidence identifies these as Chromium tests. Physical iPhone Safari and Windows checks remain pending.

**Use of AI**
I used ChatGPT/Codex to compare project choices, inspect the existing code, design review logic and importers, implement the interface, prepare tests and produce seller and presentation materials. Human review remains part of the workflow. Runtime extraction uses PDF.js and JSZip, with deterministic validation and arithmetic. There is no runtime model or scanned-document OCR. The published FAQ allows solutions built with AI assistance.

**Business model hypothesis**
The first offer is a downloadable source kit for a shop or implementer that can host a static web app. A proposed introductory price is USD 19 once, subject to the seller's final listing and license selection. This is a pricing hypothesis, not a validated willingness-to-pay result. Hosted setup and a subscription require separate infrastructure and are not offered by this build. The organizer states that the creator retains 85% of sales; payment, tax and payout conditions must be checked in the seller flow. No sales or customers are claimed.

**Existing work and event progress**
See EVENT-PROGRESS.md. All preparation completed before 20 November 2026 22:00 Bangkok must be disclosed as pre-event work. Record the actual start commit and subsequent event-time improvements before final submission. Do not present the preparation as work done during the event.

**Links to attach**
Use the verified immutable preview, exact source commit and Figma URL recorded in LINKS.json when available. Include the demonstration video and test evidence if the form supports attachments or links. A video duration requirement has not been verified; the included short video is optional supporting material.

**Limitations shown to buyers**
THB only. Whole positive quantities. Supported table layouts only. One-sheet XLSX without formulas/merges. DOCX tables. PDF must contain selectable text and recognized column headers on every page. No photo/scanned OCR, tax calculation, signatures, automatic sending, account or cloud history. A count match is not proof of correct item interpretation.
