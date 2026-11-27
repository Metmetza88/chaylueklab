# Final Status — P.SOMNUEK Education 2570

**Phase A: LOCAL PASS / LIVE BLOCKED — ยังไม่พร้อมเปิดระบบโรงเรียนจริงหรือขายว่าใช้งานครบทุกโมดูล**

Repository `Metmetza88/chaylueklab` · branch `feature/education-2570` · PR https://github.com/Metmetza88/chaylueklab/pull/58 (คง Draft)

## สิ่งที่เปลี่ยนจริง

- หน้าร้าน Software Store ภาษาไทยสีฟ้า/กรมท่า, Homepage, Catalog 14 หมวด/17 ผลิตภัณฑ์, Categories, Details, Compare, Quotation, Help/Manual
- รักษา Exam Studio, Smart Exam, Smart Certificate เป็น 3 browser demo modules; ไม่ลบระบบสอบเดิม
- โค้ด shared Auth/Workspace/Customer/Admin, module flags, License/Entitlement provisioning, notifications, service requests, reports/CSV พร้อม loading/error/empty/success states
- Migration additive ใน education_2570 สำหรับ 11 shared tables + constraints/indexes/RLS/functions; **ยังไม่ apply จริง**
- CI ของ Education: install/lint/tests/DB/security/build/Playwright + shared CodeQL gate ก่อน guarded Preview/smoke; Production เป็น review-only ไม่มี auto-deploy/promote
- แบบ Figma Desktop/Mobile: https://www.figma.com/design/RzDmHcof1KJA13U8dHKMiV
- เอกสาร ARCHITECTURE, DATABASE, SECURITY, TEST-REPORT, TOOLS-STATUS และหลักฐานทดสอบอยู่ในโฟลเดอร์นี้

## ผลยืนยัน

| สถานะ | รายการ |
|---|---|
| PASS | Local ESLint, 35 Unit/API/Security, 12 PostgreSQL integration, 28 Playwright E2E, build, artifact checks, npm audit (0), local smoke |
| BLOCKED | Supabase Primary binding/credentials ไม่พร้อม: ไม่ได้ตรวจ 10 ตารางจริง, apply migration, advisors หรือทดสอบบัญชีจริง |
| BLOCKED | Vercel target `psomnuek-education-2570` ตอบ 404 ใน Team ที่กำหนด; search ไม่พบ Project; CLI ยังไม่ login; ไม่มี Preview URL |
| BLOCKED | Commercial hosting entitlement/ค่าใช้จ่ายของ Team ยังไม่ยืนยัน จึงไม่เปิด deploy flag หรือสมัครแผนใหม่ |
| NOT TESTED | iPhone/Windows เครื่องจริง, official PDF output, full penetration/load tests, live backup/restore, production release |
| NOT STARTED | ระบบจริงของ Phase B–D; แสดงเพียงคุณสมบัติตามแผนและสถานะจริงใน Catalog |

ไม่มี outstanding local test FAIL หลังแก้ตาม TEST-REPORT. ผล local PASS ไม่ใช่หลักฐานว่า Production พร้อมใช้งาน

## สิ่งที่ยังต้องทำก่อน Phase B

1. เชื่อม Primary ให้ query ได้จริง แล้วรัน `sql/inspect-existing.sql` เทียบตาราง/index/policies เดิมและตรวจ advisors. ห้ามใช้ schema baseline fixture เป็นข้ออ้างว่าตรวจ live แล้ว
2. ตรวจ migration กับ live schema, ทดสอบ/ใช้เฉพาะ education_2570 ตามสิทธิ์ที่มี, expose Data API อย่างถูกต้อง และยืนยัน RLS ด้วยบัญชีสองโรงเรียนจริง
3. จัดเตรียม Auth users / school memberships / platform admin โดยเจ้าของ และตรวจ account lifecycle/rate limits. ยังไม่มี CRUD ตารางเดิมหรือ signup/reset ที่อ้างว่าพร้อมแล้ว
4. แก้ access หรือระบุ ID ที่ตรวจสอบได้ของ Vercel Project เดิม ตรวจ root/repo/plan/ค่าใช้จ่าย แล้ว Preview จากสาขาเดิมพร้อม remote smoke. ไม่สร้าง Project ทดแทนและไม่ใช้เว็บหลัก
5. UAT โรงเรียนจริงและเจ้าของอนุมัติความพร้อม/ราคา ก่อนเปิดใช้งานหรือพัฒนา Phase B ทีละโมดูลตามลำดับ

ไม่มีการ Merge main, Deploy/Promote Production, เปลี่ยนเว็บไซต์หลัก, แก้ live schema อื่น, ซื้อบริการ หรือเรียก paid AI API ในงานนี้

CodeQL เคยพบ ReDoS ในอีเมลของ commit 7b24bed และแก้ด้วย linear validation + regression test แล้วใน source นี้. [ผล CI ล่าสุดของ PR](https://github.com/Metmetza88/chaylueklab/pull/58/checks) เป็นหลักฐานการตรวจซ้ำบน Runner จริง ไม่ใช้ผล npm audit แทน SAST
