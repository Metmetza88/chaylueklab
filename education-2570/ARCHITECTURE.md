# Education 2570 — Shared Software Platform

ขอบเขต: `Metmetza88/chaylueklab`, branch `feature/education-2570`, PR #58, root `education-2570` เท่านั้น เว็บหลักไม่เปลี่ยน

ผู้จัดจำหน่าย: ร้าน พ.สมนึก 2&3 · ผู้พัฒนา: WORAMET AI LAB · ไทย / THB / Asia/Bangkok

## โครงสร้างที่สร้างใน Phase A

```text
Software Store (public)
  Homepage → Catalog (14 categories / 17 products) → Details
  Compare (up to 3) → Quotation draft → authenticated submission
  Help / Manual / three existing browser demos
        │ same-origin HTTP
api/education.mjs (allowlisted actions, CSRF, verified session)
        │ user JWT + Accept/Content-Profile education_2570
Supabase Auth → PostgreSQL RLS → school membership / platform admin
        │
School Workspace / Customer account / Admin / Notifications / Reports
```

- `src/catalog.mjs`: ทะเบียนสินค้าและสถานะจริงร่วมกันระหว่าง Frontend/API ไม่มีราคาที่ตั้งขึ้นเอง
- `src/views.mjs`: View functions ใช้ HTML escaping; `src/app.mjs`: navigation, forms, loading/error/empty/success states
- `lib/supabase-client.mjs`: Adapter ของ Supabase REST/Auth, pin project host, ใช้ Publishable Key และ JWT ผู้ใช้ ไม่มี service-role client
- `lib/platform-core.mjs`: Validation, pagination, membership, AI adapter ที่ปิดไว้
- `modules/demos.mjs`: เก็บ Exam Studio, Smart Exam, Smart Certificate เดิมเป็นโมดูล ไม่ใช่หน้าร้านหลัก
- `supabase/migrations/`: Migration ใหม่ของ Education แยกจาก migration เว็บหลัก; ยัง **ไม่ได้ apply ไป Supabase จริง**
- `scripts/build.mjs`: Prerender homepage, copy เฉพาะ public/src/modules, bundle font พร้อม OFL license; ไม่ส่ง SQL/tests/env ไป public

## เส้นแบ่ง Catalog และ Workspace

Catalog เป็นข้อมูลสำหรับสำรวจและขอราคา ทุกคนดูได้ แต่ไม่ได้ให้สิทธิ์ใช้ข้อมูลโรงเรียน มี 3 browser demos สถานะ `trial` และผลิตภัณฑ์ตามแผนอีก 14 กลุ่มสถานะ `unavailable` ไม่มีโปรแกรมที่อ้างว่า production-ready

Workspace ต้องผ่าน Auth จริง, membership ของโรงเรียนที่เลือก และ RLS. API ตรวจสิทธิ์ก่อนอ่าน tenant records และส่ง JWT ให้ฐานข้อมูลตรวจซ้ำ รายการ tenant อ่านครั้งละ 25 รายการ ส่วนสมาชิกของบัญชีจำกัด 100 และ registry จำกัด 100 ไม่เกิด N+1 จากการวนอ่านทีละโปรแกรม

`can_use_module(school,module)` ตรวจ member + entitlement + license + subscription + expiry + module flag + status ready. ปัจจุบันไม่มี endpoint โปรแกรมงานโรงเรียนจริงที่อ้างว่าใช้งานได้ การออก License ไม่ทำให้ Demo กลายเป็นโปรแกรมจริง

## งานของ Phase A ที่รองรับในโค้ด

- Login/logout ด้วยบัญชี Supabase ที่ผู้ดูแลจัดเตรียม, Secure HttpOnly cookie; session หมดอายุภายใน 1 ชั่วโมง ต้อง login ใหม่ ไม่มี auto-refresh/signup/password reset ที่ยังไม่ทดสอบ
- School Workspace แสดงสิทธิ์/License/แจ้งเตือน, selector เฉพาะสมาชิก
- Customer dashboard: ชื่อผู้ติดต่อของตน, ประวัติคำขอ, แจ้งปัญหาและติดตามสถานะ
- Platform admin: ดูโรงเรียน/ลูกค้า/License/คำขอ/Audit, เปิดปิด flag, ออก License และ Entitlement ด้วย RPC transaction, ระงับ/เปิดสิทธิ์, ติดตามงานบริการ
- Quotation: ร่าง/พิมพ์สรุปโดยไม่คำนวณราคา; ส่งคำขอจริงได้เฉพาะ teacher/admin ของโรงเรียนหลังยืนยัน ข้อมูล created_by มาจาก Auth ไม่รับจากฟอร์ม
- Notification จาก DB trigger เมื่อรับคำขอ; CSV report ป้องกัน spreadsheet formula injection

โรงเรียนและสมาชิกเดิมเป็นข้อมูลที่อ่านตาม RLS ยังไม่มี CRUD ของตารางเดิม/การสร้าง Auth users ผ่าน service role เพราะตรวจ live schema ไม่สำเร็จ ไม่ได้อ้างว่า Phase A เปิดใช้งานจริงครบแล้ว

## ขอบเขตระยะถัดไป

| Phase | ลำดับ | สถานะ |
|---|---|---|
| A | Store, Auth, Workspace, Admin, Modules, Quotations | โค้ดและ local tests; live verification BLOCKED |
| B | พัสดุ → ลงเวลา → สารบรรณ → แจ้งซ่อม → จองห้อง | Catalog/แผนคุณสมบัติเท่านั้น ยังไม่มีระบบจริง |
| C | สมัครเรียน → ทะเบียน → เช็กชื่อ → ตารางเรียน → ข้อสอบเดิม → เกียรติบัตร | เก็บ 3 browser demos เดิม; ระบบนักเรียนจริงยังไม่พัฒนา |
| D | การเงิน → ห้องสมุด → โภชนาการ → กิจกรรม → AI | Catalog เท่านั้น, AI adapter ไม่เชื่อม Provider |

ไม่สร้างตารางของ Phase B–D ล่วงหน้า ก่อนเพิ่มโมดูลต้องปิดงาน/ทดสอบ Phase A จริงและพัฒนาแต่ละโมดูลจนผ่านเกณฑ์ใช้งาน

Shared File Management, CSV Import, approval workflow, document storage และ server-generated official PDF เป็น interfaces/งานระยะถัดไป ไม่แสดงปุ่มที่อ้างว่าทำได้แล้ว ปัจจุบัน PDF เป็น Print/Save as PDF ของเบราว์เซอร์สำหรับเอกสารสาธิต/สรุปคำขอเท่านั้น
