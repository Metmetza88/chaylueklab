# Education 2570 | พ.สมนึก 2&3
ส่วนนี้แยกอยู่ใน `education-2570/` ของ Repository เดิม `Metmetza88/chaylueklab` ไม่แก้เว็บหลัก
## Run
```bash
cd education-2570
npm ci
npm run lint # Syntax checks; ยังไม่ใช่ ESLint
npm test     # Automated Node tests
npm run build
```
## Vercel
สร้าง **Vercel Project แยก** ที่ GitHub repo เดิม, Root Directory: `education-2570`, Framework: Other, Output Directory: `dist`. อย่าใช้โดเมนของเว็บหลักโดยไม่ได้ตรวจสอบก่อน

Environment Variables ฝั่ง **Vercel Project Education**:
- `EDU_SUPABASE_URL` = Supabase URL ที่มี Schema `education_2570`
- `EDU_SUPABASE_PUBLISHABLE_KEY` = Publishable Key (ไม่ใช่ Service Role/Secret)

Supabase Integrations > Data API ต้องเพิ่ม `education_2570` ใน exposed schemas เฉพาะเมื่อเช็ก RLS/GRANT แล้ว ข้อมูลใน Schema ปัจจุบันยังไม่มีข้อมูลตัวอย่างจริง ข้อมูลและการ Login หน้าเว็บเดโมยังไม่ได้เชื่อม API
## GitHub Actions
Workflow `.github/workflows/education-2570.yml` ทำงานกับ PR / Push สู่ main เฉพาะเมื่อไฟล์ Education เปลี่ยน ติดตั้ง Dependencies ด้วย `npm ci` → Syntax Check → Tests → Build; ทุกขั้นผิดพลาดทำให้ Job ล้มเหลว ควรตั้ง branch protection ให้ job `Lint, Unit Tests, Build` เป็น required และเปิด GitHub Notification สำหรับ Workflow Failure

Deployment **ปิดไว้ค่าเริ่มต้น** (`EDU_DEPLOY_ENABLED` ยังไม่ตั้ง) ต้องสร้างโปรเจกต์ Vercel แยกและเช็ก Project ID ก่อนเปิด

GitHub Actions **Variables**:
- `EDU_DEPLOY_ENABLED=true` เมื่อพร้อมเท่านั้น
- `EDU_VERCEL_ORG_ID`
- `EDU_VERCEL_PROJECT_ID` (Education project เท่านั้น)
- `EDU_VERCEL_CLI_VERSION` เวอร์ชันที่ตรวจสอบแล้วแบบ `x.y.z`

GitHub Actions **Environment**: `education-production`, จำกัด Branch เฉพาะ `main` และตั้ง Required Reviewers ตามนโยบาย

**Secrets** (กำหนดใน Environment นี้):
- `EDU_VERCEL_TOKEN` (least privilege)
- `EDU_VERCEL_AUTOMATION_BYPASS_SECRET` (เฉพาะเมื่อเปิด Deployment Protection)

CI Deploy: Vercel pull → Vercel build → `vercel deploy --prebuilt --prod --skip-domain` → ตรวจหน้าเว็บบน URL ที่ Stage → `vercel promote`. ถ้าทดสอบไม่ผ่านจะไม่ Promote. ต้องตรวจว่า Git Integration ของ Vercel ไม่ได้ปล่อย Production ซ้ำ

## Database
Schema ปัจจุบันอยู่ในบัญชี Supabase Primary; RLS เปิดทุกตาราง, grants SELECT เป็น authenticated เท่านั้น และมี Index 12 จุดใน `sql/education_2570_fk_indexes.sql` ที่เพิ่มแล้ววันที่ 26 พ.ย. 2026 ไม่แก้ข้อมูลระบบอื่น. ก่อนใช้งานจริงต้องทดสอบ JWT, schema exposure และ RLS ด้วยบัญชีทดสอบ

## Limitations
API ตอนนี้รองรับ GET me/catalog/quotes และ POST estimate (คำนวณเท่านั้น ไม่บันทึกใบเสนอราคา); หน้าสาธิตยังไม่เชื่อม API และไม่ควรอ้างว่าเปิดระบบโรงเรียนจริงสำเร็จ
