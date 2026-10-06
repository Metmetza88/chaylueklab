# CHAYLUEKLAB Control Center

รวมส่วนที่เหมาะสมของ `CHAYLUEKLAB-control-center.patch` ที่เจ้าของส่งมาเข้ากับระบบหลังร้านใน repository `Metmetza88/chaylueklab` เดิม รักษา Life OS, Free/Plus 59, Snooze, AI Video และ Newsroom ไม่สร้างเว็บไซต์หรือ LIFF ใหม่

## ทางเข้าเดียวกับสต๊อกเดิม

- หน้าแรก Life OS เชื่อมไป `./control.html`
- `control.html` และ `stock.html` ใช้ `assets/stock.js`, `assets/stock-client.js`, configuration และ API ชุดเดียวกัน
- `https://liff.line.me/2011681452-yexLrODy/control.html` ใช้ LIFF ที่เจ้าของให้ไว้ ส่วน LIFF ของ Life OS เดิมยังอยู่
- `?view=control` และ `?view=stock` ในหน้าแรกส่งไปหน้าที่ตรงกันหลัง `liff.init()` เสร็จ เพื่อไม่ขัดจังหวะ LINE callback
- `stock.html` เป็นแหล่ง HTML หลัก; รัน `node scripts/prepare-control.mjs` เมื่อแก้หน้าเพื่อสร้าง `control.html` ให้ตรงกัน ทั้งสองหน้าโหลด SDK เองโดยไม่เปลี่ยน URL ก่อน SDK ประมวลผล callback

งานนี้ส่งให้ตรวจผ่าน branch `fix/control-center-plus59` ใน repository เดิม เจ้าของเปิด PR #6 พร้อมตรวจแล้ว งานรวมล่าสุดรักษาโค้ด PR #5 ที่เพิ่ง Merge เข้า `main` การเชื่อม [ChatGPT Codex Connector](https://github.com/apps/chatgpt-codex-connector) มีสิทธิ์เขียน source และ tree ที่ส่งตรวจต้องตรงกับชุดที่ทดสอบ หน้า production ยังไม่ได้เผยแพร่จากงานนี้

เจ้าของบันทึกข้อยกเว้น `refs/heads/fix/control-center-plus59` ใน [กฎ M](https://github.com/Metmetza88/chaylueklab/settings/rules/24528302) แล้วผ่าน **Target branches → Add a target → Exclude by pattern** ทำให้ส่ง branch สำหรับตรวจงานได้ `main` ยังคงอยู่ในเป้าหมายของกฎ ข้อกำหนดการสร้าง/อัปเดต/ลบและ code coverage หายไปจากกฎที่บันทึกล่าสุด ต้องคืน **Restrict creations, Restrict updates, Restrict deletions, Restrict code coverage** ให้เหมือนค่าก่อนแก้ก่อน Merge การเชื่อมต่อนี้ไม่มีสิทธิ์ administration จึงไม่ได้แก้ ruleset เอง

## ส่วนที่นำมารวม

นำแนว Hero Dashboard, โทน Charcoal/Muted Gold, การ์ด Quick Action และฟอนต์ Noto Sans Thai ขนาด 26,924 bytes มาใช้ ฟอนต์เสิร์ฟจากเว็บไซต์เดิม มี SIL OFL ที่ `assets/fonts/OFL-NotoSansThai.txt` ไม่ต้องเรียกบริการฟอนต์ภายนอก ตัวเลขสต๊อกยังเด่น ปุ่มใหญ่และรองรับ reduced motion

นำการแก้ OPTIONS 204 ให้ไม่มี body มาใช้กับ shared membership helper และไฟล์ต้นทาง `membership.ts` ตรวจ API Video จริงที่ติดตั้งอยู่แล้วพบว่า version 2 มีการแก้นี้อยู่ จึงไม่ deploy ทับ API เพียงเพื่อแก้สิ่งที่แก้แล้ว ตรวจ TypeScript ของ Video เพิ่มเติมพบ job identifier อาจเป็น undefined จึงเพิ่ม guard ก่อนเรียก provider และทดสอบว่า reservation ที่ผิดรูปไม่เรียกบริการที่คิดเงิน

ไม่เปิดหน้าของ patch ที่เขียน `retail_products` ควบคู่กับหน้าที่เขียน `stock_variants` เพราะจะเกิดสต๊อกสองชุด ตารางและ API `retail-control` ที่มีอยู่ยังถูกเก็บไว้และไม่ได้ถูกลบ/เขียนทับ ตรวจวันที่ 6 ตุลาคม 2026 พบ retail products/staff/transactions และ stock variants ไม่มีข้อมูลจริง หน้า Control Center ที่รวมนี้เรียกเฉพาะ `stock` API และไม่ติดตั้ง SQL ของ patch ซ้ำ

## การใช้งาน

เจ้าของใช้บัญชี LINE เดิม เพิ่มชื่อสินค้า สี ไซซ์ SKU และจำนวนที่มีจริงใน **สต๊อก** พนักงานใช้หน้าเดียวกัน กดขอสิทธิ์ แล้วเจ้าของอนุมัติใน **ทีมงาน** ไม่ต้องสมัครบัญชีอีกชุด

ขายหน้าร้าน: **ขายสินค้า → หน้าร้าน → ไซซ์ → ยืนยัน** จำนวนเริ่มต้น 1 ขายออนไลน์เลือก LINE/Facebook/TikTok/Shopee/อื่น ๆ ใส่ออเดอร์ ลูกค้า และหมายเหตุได้โดยไม่บังคับ ทุกช่องทางหัก `stock_variants.stock_quantity` กลางเดียวกันด้วย database transaction ป้องกันสต๊อกติดลบและคำขอซ้ำ รายงานแสดงจำนวนชิ้น ไม่สร้างราคาสินค้าเอง

รายละเอียด backend, permissions, atomic transaction และ Realtime อยู่ใน [STOCK.md](STOCK.md) ไม่ต้องเพิ่ม API key สำหรับ Control Center

## การตรวจสอบ

```sh
node scripts/prepare-control.mjs
node scripts/prepare-billing.mjs
node --test tests/*.test.mjs
npx --yes deno@2.5.2 check supabase/functions/stock/index.ts supabase/functions/video-create/index.ts supabase/functions/video-status/index.ts supabase/functions/billing/index.ts supabase/functions/stripe-webhook/index.ts
node scripts/verify-stock-browser.mjs
node scripts/verify-lifeos-premium-browser.mjs
```

Browser suite ใช้ LINE/API fixtures ที่ระบุชัด ไม่มีรายการขาย เงิน หรือสมาชิก production ถูกใช้ ตรวจหน้าจอ 320/360/390/412/1280 px, ฟอนต์ไทย, ช่องทาง STORE/LINE ใช้ยอดเดียวกันผ่านสอง route, สินค้าหมด, ขอสิทธิ์, จำนวนหลังขาย, retry, double request, permissions และ callback path เดิม ผ่าน 17 Stock checks และ 11 Life OS checks การเข้า LINE ด้วยเจ้าของ/พนักงานจริงบน iPhone/Android และ Stripe test/live ยังต้องตรวจหลังเผยแพร่และตั้งค่า Secrets

GitHub Actions `Quality checks` ตรวจ generated source, Node tests และ Deno type checks ของ PR โดยใช้สิทธิ์อ่าน source เท่านั้น ไม่ใช้ production Secrets และไม่ deploy หลังบ้านหรือหน้าเว็บ

## Publication from the existing repository

PR #5 added the existing `github-pages` publishing and CodeQL workflows to `main` while PR #6 was under review. This integration preserves those workflows and the existing legacy API/data, resolves the overlapping Control Center route to the single `stock` API, and keeps both `control.html` and `stock.html` on the same inventory ledger. The legacy `retail-control` endpoint is retained for compatibility, but the active Control Center does not create another inventory.

The publishing workflow stages only public pages and assets. It excludes server functions, database SQL, test fixtures, and scripts from the Pages artifact. The existing `codex/retail-control-center` branch is already allowed by the `github-pages` environment. Deploy the reviewed commit through that branch with a normal fast-forward after unit and CodeQL checks; do not fake deployment statuses or change branch protections.

`https://chaylueklab.com` is hosted separately from this repository's GitHub Pages. The selected Sites account currently exposes only the Video Studio project and cannot access the owner's main Site. Publishing GitHub Pages does not update that domain. No replacement Site or domain is created. Real Stripe checkout is blocked by missing Stripe Secrets and access to the existing Life OS Supabase project; AI generation requires a configured provider key.
