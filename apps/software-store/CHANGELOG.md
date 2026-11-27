# ประวัติการอัปเดต

## หน้าแรก / Counter, Feature tabs, FAQ — 2026-11-27

- เพิ่ม Counter จำนวนโปรแกรม/Demo/Sourceรุ่นทดสอบที่ตรวจสอบได้ พร้อม reduced motion
- สลับภาพหน้าจอและจุดเด่นของ3ระบบในแท็บโดยไม่โหลดหน้าใหม่ และเพิ่มFAQแบบเปิดปิดก่อนท้ายเว็บ
- ให้ metadata อยู่ในheadเพื่อแก้HTML hydration mismatchที่พบระหว่างตรวจหลายหน้า โดยเก็บการตรวจbrowser errorไว้

## หน้าร้าน / Demo chooser — 2026-11-27

- หน้าเลือก Demo แสดงภาพหน้าจอที่จับจากระบบ School Pro, Admission และ Attendance ที่เปิดทำงานจริง พร้อมป้ายข้อมูลสมมติและลิงก์เปิดระบบจากภาพ
- ใช้ธีมของเว็บออนไลน์ปัจจุบัน และให้ภาพเห็นครบโดยไม่ตัดขอบแบบฟอร์ม

## ปรับรูปแบบหน้าร้าน — 2026-11-27

- ปรับภาพรวม Navy/Champagne Gold และภาพ Adobe ใหม่ พร้อมธีม3แบบที่จำในเบราว์เซอร์ ปิดเอฟเฟกต์ได้ และเคารพการลดการเคลื่อนไหวของอุปกรณ์
- เพิ่มแถบความคืบหน้าการอ่านและกลับด้านบน ปรับการ์ด ฟอร์ม เมนู และการอ่านบนมือถือ โดยคงสถานะ Coming Soon และปิดรับเงินจริง
- แก้ return path หลังเข้าสู่ระบบที่มีอักขระควบคุม เพิ่มข้อมูลแชร์เว็บ robots และ sitemap ของโดเมนร้านเดิม
- รวมงานล่าสุดจาก ef123d5 รวมหน้ารวมโรงเรียนและตัวอย่างลงเวลา ดูขอบเขตการตรวจใน docs/PREMIUM-REFRESH-20261127.md

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

- แก้ฟอร์มให้รักษาข้อมูลที่กรอกเมื่อ validation ไม่ผ่าน และ reset หลังบันทึกสำเร็จ ทดสอบ regression ผ่าน signup/checkout/admission/review/cross-school ใน Local แล้ว

- รวมการแก้ผลรับสมัคร: ซ่อนสถานะ/หมายเหตุการคัดเลือกจาก Data API จนประกาศผล และเพิ่มคิวใบสมัครแบบ cursor pagination สำหรับรายการเกิน100
- ป้องกันการเปลี่ยนข้อมูลระหว่าง Server Action ด้วย fieldset pending และปรับหน้าร้านที่ยังไม่ตั้งฐานข้อมูลให้ติดต่อ/ดูแคตตาล็อกได้ชัดเจน
- Pin Node.js22.x ใน package/lock ให้ตรง CI และ Vercel แทนช่วง >=22 ที่อาจเปลี่ยน major โดยอัตโนมัติ
