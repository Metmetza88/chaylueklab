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
