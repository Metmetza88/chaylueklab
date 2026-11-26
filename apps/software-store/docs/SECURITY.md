# Security Report — 2026-11-24

ขอบเขต: `apps/software-store` และ schema ที่เพิ่มใหม่ ไม่ใช่ใบรับรองความปลอดภัยของ LIFE OS, ร้านเสื้อผ้า, LINE OA หรือระบบเดิมทั้งหมด

## สิ่งที่แก้จาก ZIP และ SQL ที่แนบ

- เลิกใช้ตารางทั่วไปที่อาจชนระบบเดิม เพิ่ม `store_*`, `school_*`, private schema และ explicit privileges
- เลิก seed ยอดขาย/คะแนนรีวิวสมมติ เลิกใช้ ready และ version ที่ไม่มี source หรือผลทดสอบรองรับ
- เปลี่ยน checkout หลาย request เป็น Transaction เดียว ราคาคำนวณจาก DB สินค้าทุกรายการต้องมี release ตรงสินค้าและผ่าน test attestation จึงสั่งได้
- แยก payment mode ที่ env + DB และ live owner approval แยกจาก sandbox ไม่ออก QR จริงใน sandbox
- เปลี่ยน shared-secret-only webhook เป็น HMAC raw body, timestamp, bounded payload, strict schema, recipient, currency, mode, event identity และ unique transaction reference
- Payment, grants, audit และ outbox commit พร้อมกัน ชำระผิดยอดไม่เกิด grant; event retry เดิมไม่เพิ่มสิทธิ์ซ้ำ
- RLS ปิด client INSERT/UPDATE/DELETE ตารางราคา สถานะ VIP/admin grants และใบสมัคร ทุก privileged RPC revoke PUBLIC/anon/authenticated
- download ตรวจผู้ใช้ด้วย Auth server, สินค้า/release, grant ของตนหรือ VIP ที่มีวันหมดอายุ, rate limit, audit ก่อนออก Signed URL อายุ 60 วินาที
- Private bucket ทั้งสี่ พร้อม restrictive policy บล็อก client เฉพาะ bucket ใหม่ แม้ระบบเดิมมี storage policy กว้าง โดยไม่เปลี่ยนการเข้าถึง bucket เดิม
- อัปโหลดเฉพาะ PNG/JPEG ตรวจ magic bytes/size/pixel count และ re-encode ด้วย Sharp เพื่อลบ metadata/เนื้อหาแฝง ไม่รับ SVG/HTML/PDF upload ส่วน ZIP ตรวจ path traversal, symlink, uncompressed total และสิ่งส่งมอบที่จำเป็นก่อนเก็บ
- ป้องกัน CSV formula injection, query ผ่าน parameterized Supabase/SQL, แสดงข่าวเป็น plain text ที่ React escape, safe redirects และ same-origin signout ใช้ Next Server Action origin checks สำหรับ mutation
- tenant/role มาจาก school_members ไม่ใช้ user_metadata เจ้าหน้าที่คนละโรงเรียน/editor อ่านข้อมูลเด็กไม่ได้ ผู้ปกครองอ่านเฉพาะใบสมัครตนเอง
- Demo ไม่รับชื่อ เบอร์โทร หรือไฟล์จริง สถานะสมมติอยู่เฉพาะ browser memory PDF Demo ใช้ค่าคงที่
- distributed rate limiter ใน DB สำหรับ auth, checkout, downloads, support, documents, PDFs และ exports; fail closed เมื่อฐานข้อมูลขัดข้อง
- คิวแจ้งเตือน signed, leased และ retry ได้ ไม่มีการประกาศส่งสำเร็จโดยไม่มี 2xx จากปลายทาง

## หลักฐานการทดสอบ

ดู `TEST-REPORT.md`, `INTEGRATION-RESULTS.json` และ source ใน tests การทดสอบ RLS/transaction ใช้ PostgreSQL, GoTrue และ PostgREST จริงใน Local แยกจากข้อมูลเดิม ไม่มีการแก้ฐานข้อมูล Production เพื่อทดสอบ

## ข้อจำกัดที่ยังต้องตรวจรับ

1. Supabase Storage API จริงยังไม่ทดสอบ upload / Signed URL / expiry ครบ Local ใช้ storage schema fixture เท่านั้น
2. ยังไม่มี provider adapter ที่ได้รับอนุญาตตรวจธนาคาร/สลิปจริง HMAC trusted bridge ไม่ได้ตรวจภาพสลิปเอง รูปที่แก้ไขแล้วอาจมี hash ต่าง จึงต้องตรวจ transaction reference ที่ธนาคาร
3. ไม่มี malware scanner สำหรับ ZIP Source Code ผู้ดูแลต้องตรวจ source, dependency, licenses และ SHA ของ release ตรง CI ก่อน attestation การติ๊ก UI ไม่แทน automated test execution
4. ยังต้องทดสอบอีเมล SMTP จริง, password recovery link delivery, owner MFA และกำหนดรอบ backup/restore
5. CSP ของ Next รองรับ inline scripts/styles จึงยังต้องระวังไม่เพิ่ม raw HTML rendering; production ปิด unsafe-eval และมี frame-ancestors/object/base/form restrictions
6. ยังไม่มี automated retention/deletion ของข้อมูลนักเรียนและเอกสาร ต้องกำหนดนโยบายโรงเรียนและกระบวนการลบ/สำรองก่อนข้อมูลเด็กจริง ไม่อ้างว่า checkbox เท่ากับผ่าน PDPA
7. คิวแจ้งเตือนไม่ส่งหากยังไม่มี endpoint/secret และ scheduler ที่ได้รับอนุญาต ต้องให้ receiver deduplicate event_id
8. ต้องตรวจ account/project/region จริงก่อนใช้ migration และรัน Supabase Security Advisors หลังติดตั้ง ไม่ยืนยันความปลอดภัยบน project ที่ยังไม่ได้ติดตั้ง
9. Responsive tests เป็น Chromium viewport simulation ยังต้องตรวจ Safari/Android และอุปกรณ์จริง
10. รายงานยอด admin คำนวณจาก DB ทั้งหมด รายการหน้าจอล่าสุดมี limit100 และ CSV limit10000 ต่อครั้ง ต้องเพิ่ม pagination หากเกินขนาดนี้

ไม่เปิดรับเงินจริง ไม่เปลี่ยน DNS และไม่ประกาศสินค้าพร้อมขายจนตรวจครบและเจ้าของอนุมัติ

## การเข้าถึง Source ใน GitHub

Repository ที่เจ้าของระบุเป็น **public** และ Branch ที่ Push จึงอ่าน Source ได้สาธารณะ Private ZIP และ Signed URL จำกัดการดาวน์โหลดจากร้านค้า แต่ไม่ทำให้ Source ใน public GitHub เป็นความลับ ก่อนขายแบบปิดซอร์ส เจ้าของต้องเลือกกลยุทธ์การเข้าถึง/สิทธิ์ของ Repository เดิมให้เหมาะสม การเปลี่ยน visibility อาจกระทบ GitHub Pages/Integration เดิม จึงยังไม่ได้เปลี่ยนเอง และไม่ได้สร้าง Repository ใหม่

## CI/Deploy isolation (2026-11-26)

ใช้ action SHA/CLI version ที่ pin และ token เริ่มต้น contents:read ตรวจ protected environment ว่ามี owner เป็น reviewer เพียงคนเดียวและอนุญาต branch ชื่อที่กำหนด ก่อนนำ Vercel credential มาใช้ ตรวจ Team/Project/GitHub link/Root Directory/ทุกโดเมน บังคับ payment disabled ตรวจ deployment commit/READY และ smoke test ก่อน manual promotion แยกจาก staging --skip-domain ไม่มี token ใน command arguments หรือบันทึกลง Git รายละเอียดใน CI-DEPLOY-TH.md ทั้งหมดยังไม่ใช่ผลทดสอบ Deploy จริง เพราะสิทธิ์บริการคืน403
