# ประวัติการอัปเดต

## 0.2.0-rc.1 — 2026-11-24

- แยกร้านค้า Next.js ใน Repository เดิมและออกแบบหน้าร้านภาษาไทยใหม่
- แยกตาราง store_* และ school_* จากระบบเดิม พร้อม RLS และ private bucket fencing
- คำสั่งซื้อและการยืนยันเงินแบบ transaction, idempotency, server pricing, coupon locking, slip hashes, download grants และ audit/outbox
- เพิ่มระบบข่าวโรงเรียน รอบรับสมัคร ใบสมัคร เจ้าหน้าที่ เอกสาร PDF และ CSV
- เพิ่มโหมดผลิตภัณฑ์โรงเรียน Demo ใช้ข้อมูลสมมติโดยไม่ส่งข้อมูลนักเรียนจริง
- ปิดรับเงินจริงและสถานะพร้อมขาย จนทดสอบบริการจริงและเจ้าของตรวจรับ

## 0.2.0-rc.2 — 2026-11-26 — Candidate fixes and delivery workflow

- แก้ PDF ให้ใช้ static TTF สำหรับเอกสาร ตรวจภาพเรนเดอร์จริงแล้วว่าภาษาไทย อังกฤษ ปีการศึกษา เลขใบสมัคร และตัวเลขแสดงครบ ฟอนต์หน้าเว็บยังรองรับน้ำหนักเดิม
- เพิ่ม CI and Deploy สำหรับ main/manual ด้วย Node22, concurrency และ read-only permissions
- เพิ่ม scoped Vercel preflight, deployment/payment/domain guards, smoke tests และ protected-environment policy checks
- Preview/staged production แยกจาก promotion; Token ไม่ปรากฏใน command arguments และไม่มีการแก้ Environment เดิม

- ปิด auto-deploy จาก Git Integration เฉพาะแอปร้านค้าเพื่อให้ release ผ่าน CI/approval และรวม vercel.json ในแพ็กเกจ Source

## 0.2.0-rc.3 — 2026-11-26

- ป้องกัน ZIP ที่มี .env.local/.env.production, credential files, .git หรือ .vercel และยังอนุญาต .env.example สำหรับติดตั้ง
- ตั้ง cacheControl=0 สำหรับไฟล์ private ที่อัปโหลด ลดการเก็บสำเนาใน cache ต้องทดสอบ hosted CDN แยก ไม่อ้างว่าการเปลี่ยนค่านี้พิสูจน์ URL expiry บน Hosted แล้ว
- เพิ่มชุดทดสอบ Storage API จริง v1.98.6 บน CI และ browser checks ตั้งแต่อัปโหลดเอกสาร/ZIP ถึง download หลังชำระเงิน รวม revoke grant และ cross-school denial
- เพิ่มรายงาน CI ที่กรอง credentials/signed URLs/raw browser state ออก และป้องกันรายงานเก่าถูกนับเป็นผลรอบใหม่
- ยังเป็น Release Candidate, Coming Soon และปิดรับเงินจริง ผล Storage/Browser ใหม่ต้องอ้าง run ที่ผ่านจริง
