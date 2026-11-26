# Education 2570 — Software Store & Shared Platform

Repository เดิม `Metmetza88/chaylueklab` · branch `feature/education-2570` · PR #58 · root `education-2570`.
ไม่ใช่เว็บระบบสอบเฉพาะทาง ระบบข้อสอบเดิมถูกเก็บเป็น 3 browser demos ภายใน Software Store

```bash
cd education-2570
npm ci --ignore-scripts
npm run lint
npm test
npm run build
npm run check:security
npm run dev
# เปิด http://127.0.0.1:4170
```

ทดสอบฐานข้อมูล (ต้องใช้ PostgreSQL ท้องถิ่นเท่านั้น):
```bash
docker run --name edu2570-test-db -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55470:5432 -d postgres:17-alpine
npm run test:db
```

ห้ามตั้ง TEST_DATABASE_URL เป็นฐานข้อมูลจริง test runner ปฏิเสธ host ที่ไม่ใช่ localhost/127.0.0.1. ตัว fixture ลบ/สร้าง test schema เพื่อทดสอบซ้ำ ใช้เฉพาะฐานข้อมูลทดสอบแบบทิ้งได้

```bash
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

## Runtime configuration

ดู `.env.example`. Vercel server env: `EDU_SUPABASE_URL` ของ project ที่ระบุ, `EDU_SUPABASE_PUBLISHABLE_KEY`, `EDU_APP_ORIGIN` แบบ exact https origin ของ Education Preview/แอปจริง, `EDU_PLATFORM_ENABLED=false` จนกว่า live database/auth checks ผ่าน

Local server ไม่อ่าน .env อัตโนมัติ ต้อง export ตัวแปรอย่างปลอดภัยเองหากมีสิทธิ์. ไม่มีการอ่าน credentials จาก repo เดิมมาใช้เอง. เว็บสาธารณะ/เดโมไม่ต้องมี backend keys; Workspace แสดงสถานะจริงเมื่อยังไม่เชื่อม

## Preview เท่านั้น

Target เดิม: `psomnuek-education-2570`, Team `team_kA0EAug4JrrTT6ZIc54RXcmL`, root `education-2570`, repo ID `1400009958`. ขณะตรวจ MCP ตอบ 404 / search ไม่พบ Project และ CLI ไม่ได้ login. **ยังไม่มี Preview URL**

ห้ามสร้าง Project หรือใช้ Project เว็บหลักแทน. หลังเจ้าของแก้ connection/access ให้ตรวจ metadata เดิมและ free/commercial entitlement ก่อนตั้ง variables:

- `EDU_PREVIEW_ENABLED=true`
- `EDU_COMMERCIAL_HOSTING_CONFIRMED=true` เฉพาะเมื่อยืนยันสิทธิ์ใช้งานและไม่มีค่าใช้จ่ายเพิ่มแล้ว
- `EDU_VERCEL_PROJECT_ID` จาก Project เดิมที่ตรวจได้จริง ห้ามเดา

Environment `education-preview`:
- Secret `EDU_VERCEL_TOKEN` จาก credential ที่ได้รับอนุญาตแล้ว
- Optional `EDU_VERCEL_AUTOMATION_BYPASS_SECRET` ที่มีอยู่ หาก Preview protection ต้องใช้ ห้ามปิด protection

Workflow เดิม `.github/workflows/education-2570.yml`: install → ESLint → tests → local PostgreSQL/RLS → audit → build → artifact security → Playwright → (เมื่อเปิด flag) inspect project → Preview จาก SHA ของสาขาที่ระบุ → smoke test. ไม่ใช้ --prod, promote หรือ alias production. Project/team/root/repo mismatch ทำให้หยุดก่อน deploy

Production review เป็น manual workflow input + environment `education-production` เพื่อทบทวนหลักฐานเท่านั้น ไม่มี production deployment implementation ในงานนี้. ต้องตั้ง required reviewers/environment protection ใน GitHub ก่อนพิจารณาปล่อยจริง (ยังไม่เปลี่ยน settings นี้)

## เอกสาร/หลักฐาน

- `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`
- `TOOLS-STATUS.md`, `TEST-REPORT.md`, `FINAL-STATUS.md`
- `evidence/` มี log/รายงานทดสอบและ screenshot ที่ใช้ข้อมูลสมมติ
- Figma: https://www.figma.com/design/RzDmHcof1KJA13U8dHKMiV
