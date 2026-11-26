# Security — Education 2570

## การควบคุมที่มีในโค้ดและทดสอบท้องถิ่น

- Project host จำกัด `yobymeygbfiwlngmwjcn.supabase.co`; schema จำกัด `education_2570`; ไม่มี table/action ที่ต่อโดยตรงจากผู้ใช้
- ใช้ Publishable Key เท่านั้น ปฏิเสธ `sb_secret_` และ legacy JWT role `service_role`; ไม่พิมพ์ credentials/token ลง log
- ยืนยัน session กับ `/auth/v1/user` ทุกคำขอ ใช้ `__Host-edu_session; HttpOnly; Secure; SameSite=Strict; Path=/` จำกัดอายุไม่เกิน 3600 วินาที ไม่เก็บ token ใน localStorage
- การตรวจอีเมลใช้ bounded linear parsing เพื่อลด ReDoS; CodeQL gate ใช้ workflow ส่วนกลางเดิมและเป็น prerequisite ก่อน Preview
- POST ต้อง Origin ตรง `EDU_APP_ORIGIN`, JSON และ payload ไม่เกิน 12KB. ไม่มี CORS สำหรับ third-party origins
- Membership/role อ่านจากฐานข้อมูล ไม่เชื่อ role/school/user_id ในฟอร์ม และไม่ใช้ `user_metadata` เป็น authorization
- RLS บนตารางใหม่ทั้งหมด, SELECT ผูก tenant, UPDATE มี USING/WITH CHECK, column grants จำกัด feature flag, service status, notification read_at และ contact name
- Platform admins bootstrap โดยเจ้าของฐานข้อมูลเท่านั้น ผู้ใช้ไม่มีสิทธิ์ INSERT ตารางนี้
- License ผูก Subscription และโรงเรียนผ่าน composite FK; Entitlement ผูก License+โรงเรียน+Module. RPC ออกสิทธิ์ใช้ security invoker และ transaction เดียว
- Audit append จาก trigger เท่านั้น ไม่ให้ผู้ใช้เขียน/แก้ Audit; บันทึก action/table/record IDs ไม่คัดลอกคำอธิบายหรือข้อมูลติดต่อ
- ฟังก์ชัน lookup ใช้ SECURITY INVOKER. Trigger audit เท่านั้นเป็น SECURITY DEFINER, fixed empty search_path และ revoke EXECUTE จาก PUBLIC/anon/authenticated (เรียกได้ผ่าน trigger ที่ติดตั้งไว้)
- HTML escaping และ textContent สำหรับข้อมูลผู้ใช้, CSP script-src self, frame-ancestors none, nosniff, referrer/permissions policies; CSS inline ใช้เพื่อ layout จึงอนุญาต style-src unsafe-inline เท่านั้น
- CSV มีการ escape และป้องกัน formula injection. ไม่มี file upload, tracking, AI API, LINE หรือ e-GP ที่แอบทำงาน
- Demo ไม่เก็บข้อมูลนักเรียนจริง; compare localStorage เก็บเฉพาะ slug ของโปรแกรม

## ข้อจำกัดก่อนเปิดใช้งานจริง

1. Live Supabase schema, RLS, grants, schema exposure และ Auth settings **ยังตรวจไม่ได้**. Migration ไม่ได้ apply จึงไม่ใช่หลักฐานความปลอดภัยของ Production
2. ต้องตรวจ existing ten tables/policies ด้วย `sql/inspect-existing.sql` และรักษา policy เดิม ก่อนเพิ่ม policy read schools สำหรับ platform admins
3. ทดสอบบัญชีจริงอย่างน้อยสองโรงเรียน รวม stale/revoked sessions, anon access, rate limit และ account lifecycle. Unit mocks ไม่แทนการทดสอบนี้
4. ตั้ง Supabase login rate limits/CAPTCHA ตามความเหมาะสมก่อนเผยแพร่ Auth. ยังไม่มี shared application-level rate limiter ที่ทดสอบจริง ไม่ใช้ in-memory limiter เป็นข้ออ้างว่าป้องกัน distributed brute force แล้ว
5. ไม่มี auto-refresh, signup, password reset, MFA enrollment, account provisioning UI หรือ private file storage ในรุ่นนี้
6. Logout ล้าง cookie และขอ revoke session; JWT ที่ถูกขโมยอาจใช้ได้ถึง expiry ตามข้อจำกัดของผู้ให้บริการ จึงยังต้องตรวจนโยบาย Auth/session บน Project จริง
7. `EDU_PLATFORM_ENABLED=false` โดยค่าเริ่มต้น เปิดหลัง live migration/RLS ผ่านเท่านั้น ไม่มีการดึง service role มาแก้ปัญหา RLS
8. ไม่มี penetration test หรือโหลดทดสอบบน Production. Security tests เป็น regression checks ตามกรณีใน TEST-REPORT.md เท่านั้น

ไม่เปลี่ยนสิทธิ์ Plugin, Auth Provider configuration, schema อื่น, DNS หรือ Production ระหว่างงานนี้
