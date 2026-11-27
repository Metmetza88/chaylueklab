# คู่มือติดตั้งและ Deploy ภาษาไทย

## โครงสร้างและสถานะ

ใช้ Repository `Metmetza88/chaylueklab` Branch `feature/woramet-school-store-20261124` และ Root Directory `apps/software-store` ไม่แก้ Root Vercel ของเว็บไซต์หลัก ไม่สร้าง Repository ใหม่

Source สองผลิตภัณฑ์เป็น release candidate; สินค้า 15 ระบบยัง Coming Soon และปิดรับเงินจริง ต้องตรวจรับ Hosted Supabase/Storage, การตรวจเงินแบบ manual Sandbox และอุปกรณ์จริงก่อนขาย API ตรวจสลิปเป็นทางเลือกเมื่อได้รับสิทธิ์ ดู docs/PAYMENTS-MANUAL-TH.md

## 1. ก่อนแตะฐานข้อมูลจริง

1. ตรวจชื่อ Project และ region ที่ตั้งใจใช้ ห้ามเลือก Reminder Backend โดยคาดเดา
2. สำรองฐานข้อมูลด้วย Dashboard Backup/PITR หรือ `pg_dump` จากเครื่องที่ได้รับสิทธิ์ และทดสอบ restore แยกเครื่อง ข้อมูลสำรองมีข้อมูลส่วนบุคคล ต้องเก็บแบบเข้ารหัสนอก Git
3. ตรวจตาราง `store_*`, `school_*` และ schema `store_private` ว่ายังไม่มีชื่อชน Migration จะไม่แก้ตาราง `profiles`, `products`, `orders` เดิม
4. ใช้ Supabase staging/branch ที่อนุมัติไว้ก่อน Production ค่าใช้จ่ายสำหรับ branch/project ใหม่ต้องได้รับอนุมัติก่อน
5. ห้ามรัน schema/SQL ที่แนบเดิมหรือ docs/ORIGINAL-* บนฐานจริง เพราะไม่ใช่ migration อัปเกรดที่ตรวจแล้ว

## 2. ติดตั้งฐานข้อมูล

บน staging ที่เตรียมแล้ว รันตามลำดับใน transaction ด้วย SQL Editor/CLI ที่ยืนยัน Project แล้ว:

- `supabase/migrations/20261124023043_isolated_store_school_platform.sql`
- `supabase/migrations/20261126000100_school_applicant_result_visibility.sql`
- `supabase/catalog-drafts.sql`

Migration สร้างตารางใหม่ RLS ทุกตาราง exposed, RPC แบบ invoker ที่ grant เฉพาะ service_role, helper แบบ definer ใน schema private และ private buckets พร้อม restrictive storage policy ที่บล็อก client เฉพาะ bucket ของระบบใหม่

ถ้าติดตั้ง migration แรกไว้แล้ว ให้รัน migration การเปิดเผยผลก่อนอัปเดตแอป รุ่นนี้อ่านสถานะใบสมัครผ่าน RPC ฝั่งเซิร์ฟเวอร์

ตรวจ query ว่าไม่มี public bucket หรือ RLS ที่ปิดอยู่ และรัน Security Advisors ของ Project ใหม่ ตัวอย่างตรวจเฉพาะตารางใหม่:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public' and (tablename like 'store_%' or tablename like 'school_%');
select id, public from storage.buckets
where id in ('store-releases','store-slips','school-documents','school-branding');
```

## 3. Environment Variables

ใช้ `.env.example` เป็นรายการชื่อเท่านั้น กรอกค่าจริงใน `.env.local` หรือ Vercel Environment Variables โดยตรง ห้ามใส่ลง Git, chat หรือ log

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: URL/key ฝั่ง client จาก Project ที่ตรวจแล้ว
- `SUPABASE_SERVICE_ROLE_KEY`: secret ฝั่ง Server เท่านั้น
- `APP_URL`: origin ของ deployment นี้ ใช้สำหรับลิงก์อีเมล
- `PAYMENT_MODE=disabled`, `LIVE_PAYMENTS_APPROVED=false`, `PAYMENT_WEBHOOK_ENABLED=false` เป็นค่าเริ่มต้น
- ยังไม่กรอก `PROMPTPAY_ID` หรือ endpoint แจ้งเตือนจนตรวจสิทธิ์และพร้อมทดสอบ

ตั้ง Auth Site URL และ Redirect allowlist เฉพาะ deployment ที่ใช้งานจริง ตั้ง custom SMTP, email confirmation, password policy, rate limits และ MFA สำหรับเจ้าของก่อนเปิดบริการ Template อีเมลควรลิงก์ `/auth/confirm?token_hash={{ .TokenHash }}&type=email` สำหรับยืนยัน และ `type=recovery&next=/reset-password` สำหรับกู้รหัส PKCE callback ที่มี code รองรับแล้ว

## 4. เจ้าของร้านและโรงเรียน

สมัครและยืนยันอีเมลก่อน คัดลอก UUID จาก Auth Dashboard บนเครื่องที่ได้รับสิทธิ์:

```sh
node --env-file=.env.local scripts/bootstrap-owner.mjs store <owner-user-uuid>
```

หรือกำหนด admin ผ่าน SQL บน Project ที่ตรวจแล้ว:

```sql
insert into public.store_profiles(id,is_admin)
values('<owner-user-uuid>',true)
on conflict(id) do update set is_admin=true;
```

จาก `/admin` สร้างโรงเรียนให้เจ้าของโรงเรียนที่มีบัญชีแล้ว หรือสำหรับติดตั้งผลิตภัณฑ์โรงเรียนแยก Project:

```sh
node --env-file=.env.local scripts/bootstrap-owner.mjs school <owner-user-uuid> my-school 'ชื่อโรงเรียน'
```

ตั้ง `APP_VARIANT=school`, `SCHOOL_SLUG=my-school`, `PAYMENT_MODE=disabled` แล้วเจ้าของเข้า `/school-admin/my-school` ตั้งชื่อ โลโก้ สี ปีการศึกษา ข่าว และรอบรับสมัคร เว็บไซต์ยังไม่เผยแพร่จนเจ้าของเลือกเผยแพร่

## 5. Preview บน Vercel

ตรวจ team/project/account และ GitHub Integration จริงก่อน ใช้ Project ร้านค้าแยก Root Directory `apps/software-store` Framework Next.js, Node 22.x, install `npm ci --ignore-scripts` และ build `npm run build` ตั้ง Preview env แยกจาก Production

Deploy Branch นี้เป็น Preview ตรวจ Build Logs, Runtime Error Logs, `/api/health` และทุกหน้าก่อน การมี URL ไม่ถือว่าฐานข้อมูล/อีเมล/ชำระเงินจริงทำงานครบ หลักฐาน Preview ที่สร้างผ่าน Vercel connector อยู่ใน docs/VERCEL-PREVIEW-20261127.json คง SSO ไว้และไม่ผูกโดเมน Production

## 6. Sandbox และ Release gate

1. บน staging เท่านั้น ตั้ง `store_settings.payment_mode='sandbox'` และ env `PAYMENT_MODE=sandbox`
2. สร้าง release ทดสอบที่มีไฟล์จริง ทดสอบสมัครสมาชิก ยืนยันอีเมล login เลือกสินค้า สั่งซื้อ และคูปองจาก Server
3. ตรวจ upload PNG/JPEG, สลิปซ้ำ, ยอดผิด, HMAC ผิด, timestamp เก่า, transaction reference ซ้ำ, webhook retry และการคืนเงิน/ถอน grant
4. ตรวจผู้ซื้อเห็นเฉพาะคำสั่งซื้อของตน Private Storage อ่านตรงไม่ได้ Signed URL หมดอายุจริง และไฟล์ ZIP มี SHA-256 ตรง manifest
5. ตรวจโรงเรียน A/B แยกข้อมูล เจ้าหน้าที่ต่างหน้าที่เข้าไม่ได้ Round ปิดแล้วสมัครไม่ได้ และ CSV/PDF ไม่รั่วให้คนนอก
6. ผู้ดูแลอัปโหลด ZIP (ช่องนี้ไม่เกิน 7 MB), ตรวจ SHA-256 และบันทึกหลักฐานการทดสอบของไฟล์ตรงเวอร์ชัน ก่อนเปลี่ยน product ready

Webhook ในโค้ดเป็น **trusted bridge protocol** ต้องมี adapter ของผู้ให้บริการที่ได้รับอนุญาตตรวจยอด ผู้รับ และรายการธนาคารจริงก่อนส่ง HMAC ไม่ใช่การตรวจภาพสลิปอัตโนมัติในตัว ดู `docs/INTEGRATIONS.md`

## 7. เปิด Production หลังเจ้าของอนุมัติเท่านั้น

หลังครบหลักฐาน Sandbox และตรวจรับสินค้าจริง เจ้าของจึงอนุมัติเปิดรับเงินจริง แก้ env `PAYMENT_MODE=live`, `LIVE_PAYMENTS_APPROVED=true` และบันทึก `live_approved_at`, `live_approved_by`, `sandbox_verified_at` ใน `store_settings` ก่อนตั้ง `payment_mode=live` ห้ามใช้การแก้ env อย่างเดียวข้าม DB gate

ก่อนผูก `store.chaylueklab.com` ต้องขออนุมัติ DNS พร้อมค่าที่ Vercel Project ร้านค้าแสดงจริง ไม่คาดเดา CNAME และไม่แก้ apex/main site

## 8. Rollback

ก่อน Deploy บันทึก commit, deployment id, root directory และ env names (ไม่บันทึกค่า secret) เก็บ deployment ก่อนหน้าและ backup DB นอก Git หากมีปัญหาปิด `PAYMENT_MODE` และ webhook แล้ว rollback เฉพาะ Vercel Project ร้านค้า ห้าม drop ตารางหลังมีธุรกรรม ต้องใช้ forward migration หรือ restore สำรองในสภาพแวดล้อมแยกก่อนวิเคราะห์ ไม่ย้าย DNS กลับ/ไปโดยไม่มีอนุมัติ

## ข้อจำกัดก่อนใช้งานข้อมูลจริง

ต้องยืนยันข้อมูลผู้ควบคุมข้อมูล นโยบายโรงเรียน ระยะเวลาเก็บและลบไฟล์ การสำรอง/restore Monitoring และผู้มีหน้าที่ตอบคำร้อง PDPA รวมทั้งทดสอบ iPhone Safari และ Android จริง การจำลอง viewport ไม่แทนการตรวจอุปกรณ์จริง

## Workflow CI/Deploy ที่เพิ่ม 2026-11-26

ดู [CI-DEPLOY-TH.md](docs/CI-DEPLOY-TH.md) สำหรับ main/manual dispatch, Node22, protected environments, Secrets และ staged production ที่ยังไม่ assign โดเมน ไม่ใช้ Environment เดิมของเว็บไซต์หลัก Preview สร้างผ่าน connector แล้ว แต่ยังตั้ง GitHub environments/Secrets ไม่ได้ เจ้าของต้องตั้งตามคู่มือก่อนเปิด Workflow deploy

### เมื่อติดตั้งจาก ZIP ผลิตภัณฑ์โรงเรียนแยก

แตก ZIP แล้วเข้าโฟลเดอร์ที่มี package.json รัน npm ci และใช้ APP_VARIANT=school กับ SCHOOL_SLUG ที่สร้างด้วย bootstrap-owner.mjs สำหรับ Vercel Project ของโรงเรียนนี้ให้ Root Directoryเป็นจุดที่ package.json อยู่ (`.` เมื่อเชื่อม repo standalone) และใช้ Supabase Project/บัญชีของโรงเรียนตามสิทธิ์อนุญาต

Workflow/guard ใน Repositoryหลักของ CHAYLUEKLAB จำกัดปลายทางเฉพาะร้านค้า `apps/software-store` จึงไม่ใช่คำสั่งสำหรับ Deploy Project ลูกค้าในชื่ออื่น อย่าเปลี่ยน Project ID ของร้านค้าเป็นโรงเรียนของลูกค้า ใช้การติดตั้งแยกตามหัวข้อนี้และตรวจ Auth/RLS/Storage ของโรงเรียนก่อนรับข้อมูลจริง

`vercel.json` ของแอปปิด automatic Git deployments (`git.deploymentEnabled=false`) เพื่อให้ผ่าน CI/approval ก่อน release ร้านค้า ใช้ Workflow ในคู่มือ CI หรือสั่ง CLI ใน Project โรงเรียนแยกที่ได้รับอนุญาต การ Push อย่างเดียวจึงไม่ยืนยันว่า Deploy แล้ว
