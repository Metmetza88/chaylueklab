# WORAMET AI LAB — Dojo demo (feature branch only)

This is an experimental feature within the EXISTING CHAYLUEKLAB repository.
**Do not merge or deploy to production until owner review and hackathon rules have been checked.**

## What is implemented
- Original 5 working content-template tools remain unchanged in `app.js`.
- New offline sales CSV analyzer in `sales-analyzer.js` with demonstration data.
- Thai/English headers: `วันที่,สินค้า,จำนวน,ราคาต่อหน่วย` or `date,product,quantity,unit_price`.
- Sales totals, units, top 5 products, simple rule-based insights, copy summary.
- 1 MB maximum file size. CSV data is processed locally in the browser, without network upload.

## What is NOT implemented
- No Generative AI model/API and no guaranteed revenue.
- No payment, subscriptions, or production deployment.
- No real store transactions have been imported.
- This is not yet a verified hackathon submission; organizers must clarify reuse-of-existing-code eligibility.

## Test on iPhone / Windows
1. In a preview environment that serves the files from this folder, open `index.html`.
2. Scroll to **WORAMET AI LAB · DOJO DEMO** and tap **ทดลองข้อมูลตัวอย่าง**.
3. Confirm totals: **7,800 THB**, **13 units**, **6 rows**, **3 products**.
4. Tap **คัดลอกสรุป**.
5. Optionally import your own non-sensitive CSV and verify the results.

Test vectors:
```csv
วันที่,สินค้า,จำนวน,ราคาต่อหน่วย
2026-11-10,FIRST CHAPTER Ivory,2,600
2026-11-10,FIRST CHAPTER Noir,1,600
2026-11-11,FIRST CHAPTER Ivory,3,600
2026-11-11,FIRST CHAPTER Forest,2,600
2026-11-12,FIRST CHAPTER Noir,4,600
2026-11-12,FIRST CHAPTER Forest,1,600
```

## Next tasks
- Verify Dojo submission / pre-existing code rules.
- Add optional real AI service through secure server-side endpoint (no API key in frontend).
- Prepare actual mobile preview, demo video, accessibility test, and tests.
