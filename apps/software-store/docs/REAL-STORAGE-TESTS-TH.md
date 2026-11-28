# ทดสอบ Private Storage จริง

CI ตั้ง `TEST_STORAGE_API=true` และใช้ PostgreSQL17, GoTrue2.198.0, PostgREST16.6 และ Storage API1.98.6 (เวอร์ชันตาม Supabase Docker Compose ที่ตรวจวันที่ 2026-11-26) เป็น disposable services ใช้เฉพาะข้อมูลสมมติและ ZIP fixture ที่ระบุชัดว่าไม่ใช่สินค้าจำหน่าย ไม่มี project ของเจ้าของถูกใช้ทดสอบ

เครื่อง Local นี้ยังติดพื้นที่ Docker image ไม่พอหลังคืน cache แล้ว จึงใช้ CI runner สำหรับ full service ผลต้องดู run จริงก่อนนับว่าผ่าน การมี test script ไม่ใช่ผลทดสอบสำเร็จ

## คำสั่งสำหรับเครื่องที่มีพื้นที่พอ

```sh
TEST_STORAGE_API=true node tests/local/start.mjs
# อีก terminal:
node tests/local/gateway.mjs
npm run test:integration
npm run test:storage
node --env-file=.env.test node_modules/next/dist/bin/next start --hostname 0.0.0.0
# อีก terminal:
node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

ใช้ชื่อ container woramet-store-test-* และ port55431/55432/55499/55430/55500 เท่านั้น Script ปฏิเสธ URL ที่ไม่ใช่ Local test stack ก่อน destructive reset ไม่ใช้ Production database URL, tokens หรือข้อมูลเด็กจริง

`TEST_STORAGE_API=false` เปิด reduced mode สำหรับเครื่องพื้นที่น้อย เป็นเพียง schema fixture และต้องระบุข้อจำกัดนี้ในรายงาน ไม่มีสิทธิ์อ้างว่าผ่าน Storage API/URL expiry

## สิ่งที่ชุดใหม่ตรวจ

- private buckets ผ่าน Storage API, service upload/download และ SHA ของ bytes
- anon/ผู้ใช้อื่นอ่าน เขียน list หรือ sign ไม่ได้ แม้มี legacy permissive policy; bucket legacy เดิมยังทำงาน
- public URL เปิด private file ไม่ได้, signed URL ตรวจ bytes/ลายเซ็น/หมดอายุที่ origin และลบไฟล์แล้วเข้าถึงไม่ได้
- MIME/ขนาดไฟล์ที่ bucket ปฏิเสธ และ cache lifetime ของ private object เป็นศูนย์
- browser checkout → signed Sandbox bridge → grant → ดาวน์โหลด ZIP จริง/hash ตรง; ไม่มี grant หรือถูก revoke ต้องถูกปฏิเสธ
- อัปโหลดเอกสารนักเรียนสมมติผ่าน Server Action, อ่านเฉพาะผู้มีสิทธิ์ และปฏิเสธการเข้าถึงข้ามโรงเรียน
- Admin upload ปฏิเสธ ZIP ที่มี .env.local และไม่เปิดใช้ replacement ที่ยังไม่ตรวจรับ

## หลักฐานและขอบเขต

CI อัปโหลดเฉพาะ INTEGRATION-RESULTS.json, STORAGE-RESULTS.json และ E2E-RESULTS.json ใน artifact อายุ7วัน มี source commit กำกับ ไม่มี .env/auth state/traces/raw request/signed URLs ใช้เฉพาะชื่อ tests, ผล, เวลา และสถานะแวดล้อม หากไม่รันจะแสดง not_run ไม่หยิบรายงานเก่ามาอ้าง

Full Storage ที่ผ่านบน file backend ยืนยัน origin behavior เท่านั้น ยังต้องตรวจ Hosted Supabase/Smart CDN, backup/restore, SMTP, authorized payment-provider Sandbox และอุปกรณ์จริง Signed URL expiry ไม่เรียกคืนไฟล์ที่ผู้ใช้ดาวน์โหลดแล้ว และ cache ที่ CDN ต้องตรวจแยกตาม settings ของ Project
