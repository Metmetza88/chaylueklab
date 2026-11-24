# ตรวจต้นฉบับที่ได้รับ

รับ ZIP ชุดแรก 27 ไฟล์ และฉบับล่าสุดที่มี DEPLOY-TH.md/catalog-drafts.sql เพิ่มมา ใช้ฉบับล่าสุดเป็นฐานพร้อมตรวจ diff จากฉบับแรก รายการทุกไฟล์และ SHA อยู่ใน ORIGINAL-FILE-INVENTORY.json สำเนาต้นฉบับอยู่นอก repository ใน scratch และ git bundle ก่อนแก้โค้ดอยู่ใน PROJECT-STATUS.md

| ไฟล์ต้นฉบับ | สิ่งที่ตรวจพบ / การแก้ |
|---|---|
| package.json | floating ranges, ไม่มี lock/lint/tests; pin dependency และเพิ่ม checks |
| README.md / DEPLOY-TH.md | ยังเป็นขั้นเริ่มต้นและระบุ generic schema; เขียนคู่มือใหม่ตาม namespaced schema/gates |
| .env.example | เพิ่ม explicit disabled/sandbox/live, แยก private secrets, ไม่มีบัญชีรับเงินจริงตัวอย่าง |
| supabase/schema.sql | generic names ชนเดิม, trigger auth ทั่ว project, schema ไม่ตรง SQL เสริม; เปลี่ยนเป็น additive isolated migration ไม่มีการแตะ auth trigger เดิม |
| supabase/catalog-drafts.sql | รายชื่อไม่ตรง 15 ระบบที่สั่ง (มี Lunch/ไม่มี School Pro); ปรับ catalog ตามคำสั่ง ทั้งหมด Coming Soon |
| app/actions.ts | ฉบับแรกไม่ atomic; ล่าสุดมี SQL checkout แต่ไม่มี release/test, idempotency, coupons; เพิ่ม transaction RPC แบบ service-only และ server validation |
| app/admin/orders/page.tsx | กด paid โดยไม่มีหลักฐาน/transaction reference, ไม่มี audit; ย้ายไป admin workspace พร้อมตรวจยอดและ ref ใน RPC |
| app/api/payments/webhook/route.ts | shared-secret header, ไม่มี event/replay/signature; เปลี่ยน HMAC/timestamp/raw-body/recipient/mode และ transactional payment |
| app/api/download/[productId]/route.ts | ไม่ตรวจ release readiness และ audit/rate; เพิ่ม paid grant/release/security audit พร้อม private URL |
| lib/promptpay.ts | amount=0/negative/NaN ใช้ truthy branch; ตรวจ recipient, amount และ precision ก่อนสร้าง payload |
| lib/supabase/ | ไม่มี server-only boundary และ session refresh; แยก server secret พร้อม middleware refresh/getUser และ cookie settings |
| app/login,orders,membership,cart,products | เพิ่ม error states, recovery, profile setup, server prices, no fake metrics, membership gate และ screens ภาษาไทย |
| components / CSS / tsconfig | ตรวจทั้งหมด ออกแบบใหม่รองรับ mobile และเพิ่ม tests/safe cart persistence |

SQL เสริมที่แนบใช้ CREATE TABLE IF NOT EXISTS กับคอลัมน์ที่ไม่ตรง ZIP จึงอัปเกรดเดิมไม่ได้ และ policy อ่าน application อาศัย is_demo_data เพียงอย่างเดียวไม่แยกโรงเรียน จึงไม่รันโดยตรง รายงานแนบอ้างพร้อมขายสองระบบแต่ไม่มี source/tests/release รองรับ ไม่ใช้เป็นหลักฐานว่างานเสร็จ

ต้นฉบับอ้างอิงเก็บเป็น docs/ORIGINAL-* เท่านั้น ไม่ใช่คำแนะนำให้รันใน Production
