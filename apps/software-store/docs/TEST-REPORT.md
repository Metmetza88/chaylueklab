# รายงานผลทดสอบจริง — 2026-11-26

| รายการ | ผล |
|---|---|
| TypeScript | ผ่าน `next typegen && tsc --noEmit` รวมตรวจจาก ZIP ที่แตกแยกทั้งสองแพ็กเกจ |
| ESLint | ผ่าน |
| Production Build | ผ่าน Next.js15.5.29 หลังแก้ dependency และ transactional release/support |
| Unit / Security | **53/53 ผ่าน** |
| Integration / DB Security | **23/23 ผ่าน** บน PostgreSQL17 + GoTrue + PostgREST จริง |
| Playwright Production | **80 passed, 12 skipped, 0 failed** ใช้เวลาประมาณ3.8นาที |
| Responsive | 16หน้าสาธารณะ × 4viewport, ไม่มี horizontal overflow; Desktop/iPhone/Android/Tablet ใช้ Chromium ทั้งหมด |
| Standalone school variant | root redirect, real DB site, school header และ390px layout ผ่าน |
| Dependency Audit | 0 critical/high/moderate/low ตาม registry ณ เวลาตรวจ ดู DEPENDENCY-AUDIT.json |
| Source ZIP | สร้างสองแพ็กเกจ ตรวจ CRC/สิ่งส่งมอบ/การไม่รวม secrets และ TypeScript จาก source ที่แตกแยกแล้ว (ใช้ dependencies ที่ติดตั้งตรวจแล้วร่วมกัน) |

หลักฐานแบบโครงสร้าง: `INTEGRATION-RESULTS.json`, `E2E-RESULTS.json`, `DEPENDENCY-AUDIT.json`

12 skipped คือ authenticated workflows เดียวกันที่กำหนดให้รัน Desktop ครั้งเดียว ไม่รันซ้ำในอีก3viewport ส่วน responsive และ interaction tests รันทุกviewport ไม่ใช่การข้ามข้อทดสอบที่ล้มเหลว

ชุดแรกพบ timeout จากการกวาด16หน้าต่อหนึ่ง test ใน Dev Build จึงแบ่งเป็นรายหน้าและรันกับ Production Build ต่อมาพบ selector ของป้าย Demo ซ้ำกับป้าย Sandbox แก้ให้เจาะจงป้าย Demo แล้วรันใหม่ทั้งหมดจนได้ผลข้างต้น

## Workflow ที่ตรวจแล้ว

- สมัครสมาชิกและ session ด้วย GoTrue จริงใน Local (email auto-confirm เฉพาะ Local)
- Login, server-side prices, cart, atomic order, signed Sandbox bridge webhook, wrong amount, forged signature, retry, entitlement และ order receipt PDF
- Coming Soon/missing product/duplicate cart/idempotency conflict, coupon race, canonical slip hash duplicate, order/VIP manipulation และ refund revocation
- สมัครเรียนจริงลง Local DB, Thai PDF, เจ้าหน้าที่ตรวจใบสมัคร, CSV export และ cross-school admin/export/PDF denial
- role isolation: owner/officer/editor/executive/parent, round/grade/school validation, distributed rate limits
- private bucket policy fence ไม่กระทบ legacy bucket, outbox leases/daily idempotency, support transaction และ release replacement attestation
- Demo ไม่ส่งใบสมัครส่วนบุคคลขึ้น Server; public pages และปุ่มเลือก/กรอง/ทดลองใช้งานทำงาน

## สิ่งที่ยังไม่ผ่านการตรวจรับ

- **Supabase Storage API จริง:** Local มีเพียง schema fixture ทดสอบ policy ได้ แต่ยังไม่ทดสอบ upload/private file/signed URL expiry กับ Storage service จริง เพราะ Docker image ติดพื้นที่ไม่พอ
- **Payment provider Sandbox จริง:** ทดสอบ trusted bridge protocol แล้ว ยังไม่มีผู้ให้บริการตรวจเงิน/สลิปและ adapter ที่ได้รับอนุญาต
- **SMTP delivery/recovery จริง:** Local Auth เปิด auto-confirm สำหรับ test เท่านั้น
- **Physical devices:** Chromium viewport ไม่ยืนยัน Safari หรืออุปกรณ์จริง
- **Vercel Preview:** create_project คืน403 forbidden ไม่มี Preview/Production URL และไม่มี Build/Runtime Logs ของ Vercel ให้ตรวจ
- **Hosted DB advisors/backup restore:** ยังไม่ติดตั้งบน project ของเจ้าของ ไม่ได้ตรวจรับ production migration/restore

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
node --env-file=.env.test node_modules/next/dist/bin/next start --hostname 0.0.0.0
# อีก terminal:
node --env-file=.env.test node_modules/@playwright/test/cli.js test
```

Local stack ใช้เฉพาะ container woramet-store-test-* และ port55431/55432/55499/55430 integration script มี destructive reset เฉพาะฐาน Local ที่ guard URL แล้ว ห้ามชี้ Production ข้อมูลบัญชี/ใบสมัครสมมติ `.env.test`, test accounts, cookies และ traces ไม่ commit

Playwright ใช้ `/usr/bin/chromium` หรือกำหนด `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ให้ตรง environment CI ของ commit c7b1ecb ผ่านทั้ง Store/Quality/CodeQL แล้ว ส่วน Workflow Node22 และ RC2 ที่เพิ่มล่าสุดกำลังรอตรวจบน GitHub Actions อีกครั้ง ไม่ใช่หลักฐาน Deploy Vercel

จนกว่าจะครบ external tests และ owner acceptance สินค้าทั้งหมดจึงยัง Coming Soon แม้ผล Local ผ่านแล้ว

## ตรวจเพิ่ม 26 พฤศจิกายน 2026

- RC2: TypeScript, ESLint, Production Build และ53 Unit/Security tests ผ่าน Local หลังแก้ PDF และเพิ่ม deploy guards
- ตรวจ PDF ที่ render เป็นภาพจริง: เปลี่ยน PDF font เป็น Noto Sans/Noto Sans Thai แบบ static แก้ตัวอักษรอังกฤษและตัวเลขหาย ตรวจเลขใบสมัคร ปีการศึกษา ชื่อไทย จำนวนเงินและแบรนด์แล้ว ดู `public/screenshots/met-admission-pdf.png`
- actionlint1.7.12 (ตรวจ checksum) ผ่านทั้ง reusable verification และ CI/Deploy workflows
- ตรวจ VercelCLI67.0.0 help สำหรับ deploy --skip-domain และ promote --yes แล้ว ยังไม่ใช้ credential deploy จริง
- CI deploy ยังปิดไว้และยังไม่ผ่าน external acceptance; ไม่มี Preview/Production URL เกิดจากผลทดสอบ Local
