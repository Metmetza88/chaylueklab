# รายงานผลทดสอบ

สถานะระหว่างเตรียม Release Candidate — 2026-11-24

| รายการ | ผลที่มีหลักฐานแล้ว |
|---|---|
| TypeScript / ESLint | ผ่านชุดก่อนหน้า กำลังตรวจซ้ำหลัง dependency security update |
| Unit / Security | 31/31 ผ่าน (HMAC/replay, PromptPay CRC, invalid amounts, CSV, redirects, image validation, PDF, ZIP release inspection) |
| Integration / DB Security | 21/21 ผ่าน บน PostgreSQL17 + GoTrue + PostgREST จริง ดู INTEGRATION-RESULTS.json |
| Production Build | ผ่านชุดแรก Next15.5.29 กำลังตรวจซ้ำหลัง security update |
| Playwright | ชุดแรก 17 passed, 12 skipped, 3 timeout (public sweep รวม16หน้า) กำลังแยกต่อหน้าและรันบน Production Build |
| Supabase Storage API / signed URL expiry | ยังไม่ผ่านการทดสอบบริการจริง Local มีเพียง schema fixture |
| Payment provider Sandbox | ยังไม่มี authorized provider/adapter จึงยังไม่ทดสอบกับผู้ให้บริการจริง |
| Physical iPhone/Safari/Android | ยังไม่ทดสอบอุปกรณ์จริง มี Chromium viewport tests เท่านั้น |
| Vercel Preview | ถูก403 forbidden ขณะ create_project ยังไม่มี URL หรือ build logs ของ Vercel |

การทดสอบ Local ไม่แตะฐานข้อมูล Production ข้อมูลบัญชีและใบสมัครเป็นข้อมูลสมมติ ไม่ commit .env.test, test accounts, cookies หรือ traces ที่มี token

## รันทดสอบซ้ำ

```sh
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run build
node tests/local/start.mjs
# อีก terminal:
node tests/local/gateway.mjs
npm run test:integration
node --env-file=.env.test node_modules/next/dist/bin/next dev --hostname 0.0.0.0
# อีก terminal:
node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

Local stack สร้างเฉพาะ container ชื่อ woramet-store-test-* บน port55431/55432/55499/55430 สคริปต์ integration มี destructive reset เฉพาะฐาน Local ที่ guard URL แล้ว ห้ามเอาไปชี้ Production

Playwright ใช้ Chromium ใน environment (`/usr/bin/chromium`) กรณี CI ที่ใช้ browser ที่ install ด้วย Playwright ให้กำหนด PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ตาม config

## Gate ก่อนพร้อมจำหน่าย

ต้องมี Storage upload/private access/signed expiry tests, provider-specific Sandbox result, SMTP confirmation/recovery, backup/restore, owner acceptance บนอุปกรณ์จริง และอนุมัติ Production ทุกเงื่อนไข สินค้าทั้งหมดจึงยัง Coming Soon แม้ Unit/DB/UI หลายส่วนผ่านแล้ว
