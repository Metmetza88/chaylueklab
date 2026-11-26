# CI and Deploy to Vercel — ร้านซอฟต์แวร์

เพิ่ม Workflow `.github/workflows/software-store-deploy.yml` ตามคำขอวันที่ 26 พฤศจิกายน 2026 โดยแยกปลายทางจากเว็บไซต์หลัก

## พฤติกรรมที่ติดตั้งในโค้ด

- Trigger เมื่อ push `main` ที่เปลี่ยนแอปร้านค้า/ไฟล์ CI ที่เกี่ยวข้อง และ manual `workflow_dispatch`
- `permissions: contents: read`, concurrency ต่อ Workflow/Branch และยกเลิกรอบก่อนหน้าเมื่อมี commit ใหม่
- Verify ใช้ Node22 และ lockfile: npm ci, TypeScript, ESLint, Unit, dependency audit, production build, integration และ Playwright ไม่มี `--if-present` ที่ทำให้ข้ามการตรวจโดยไม่รู้ตัว
- ใช้ verify Workflow ร่วมกับ PR จึงไม่ทำให้คำสั่งทดสอบใน main กับ PR ต่างกัน
- Pin action SHA และ Vercel CLI67.0.0 ไม่ใส่ Token ใน command arguments
- Token ให้เฉพาะขั้นตรวจ API, pull, deploy และ promote; ขั้น install CLI ไม่รับ Token และปิด lifecycle scripts
- Preview / staging ตรวจ Team, Project ID, GitHub Repo, Root Directory และทุกโดเมนที่ APIส่งมา ปฏิเสธหากเป็นเว็บไซต์หลักหรือ repo/project อื่น
- ตรวจ env ที่ Vercel pull มา โดยบังคับ PAYMENT_MODE=disabled, LIVE_PAYMENTS_APPROVED ไม่เป็นtrue และ webhook ไม่เปิด สำหรับ release candidate นี้
- ตรวจ URL/Project/commit/READY และทดสอบ16หน้าพร้อม health/สิทธิ์ดาวน์โหลด/ปิดWebhookบน deployment
- Production build ใช้ `--prod --skip-domain` ยังไม่ assign โดเมน การ promote ต้อง manual action `promote-production` บนmain พร้อมการอนุมัติอีกครั้ง
- ไม่เพิ่ม DNS record และไม่เปลี่ยนเว็บไซต์หลักใน Workflow

## สถานะจริง

โค้ดผ่าน actionlint และทดสอบ guard logic แล้ว **ยังไม่ใช่ผล Deploy สำเร็จ** บัญชี Vercel ที่เชื่อมอยู่ไม่มีสิทธิ์สร้าง Project (403) และ GitHub integration ปัจจุบันไม่มีสิทธิ์แก้ Environments หรืออ่าน Variables (403) จึงยังตั้ง Secrets/Project binding ให้ไม่ได้

มี environment เดิม `github-pages`, `Preview`, `Production` แต่ไม่ย้ายหรือแก้ค่าเหล่านั้น เพราะอาจเป็นระบบเดิมของเจ้าของ

ค่า `STORE_DEPLOY_ENABLED` เริ่มต้นไม่เปิด: verify ทำงาน แต่ job summary จะแจ้งว่าไม่มีการ Deploy เมื่อยังไม่ตั้งค่า ห้ามตีความ CIสีเขียวว่าเว็บไซต์ขึ้นแล้ว

## สิ่งที่เจ้าของต้องตั้งครั้งเดียว

ที่ GitHub Repository Settings → Environments สร้างแยก3รายการ:

| Environment | Required reviewer | Deployment branches |
|---|---|---|
| store-preview | Metmetza88 | main และ feature/woramet-school-store-20261124 |
| store-production | Metmetza88 | main |
| store-production-release | Metmetza88 | main |

เลือก custom branch policies ให้ตรงรายการ Workflow ตรวจผ่าน API ว่ามี owner reviewและ branch restrictions จริงก่อนให้ job ที่ใช้ Vercel Tokenทำงาน หากตรวจไม่ได้หรือ policyไม่ตรงจะหยุดไว้

สำหรับแต่ละ Environment ใส่:

- Secret `VERCEL_TOKEN`: credentialที่มีสิทธิ์เฉพาะร้านค้า ใส่ใน GitHubโดยตรง ห้ามส่งทางแชต
- Variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: IDของ Team/Projectร้านค้าที่ตรวจแล้ว Root Directoryต้องเป็น `apps/software-store` และ link repo `Metmetza88/chaylueklab`
- Secret `VERCEL_AUTOMATION_BYPASS_SECRET` หาก deployment protection ต้องใช้เพื่อทดสอบ ไม่ต้องเปิดให้คนทั่วไปเพียงเพื่อรัน smoke tests

เมื่อสิทธิ์และProjectพร้อมแล้วตั้ง Repository Variable `STORE_DEPLOY_ENABLED=true` ไม่ต้องใส่ Token เป็น Variableชนิดplain

จากนั้น merge Workflow ผ่าน PR ที่ตรวจแล้วก่อน เพราะ GitHubแสดง manual workflow dispatchจาก default branch เลือก `preview` เพื่อตรวจหน้าร้าน หรือ `stage-production` เพื่อสร้าง production build ที่ยังไม่ผูกโดเมน เลือก `promote-production` เฉพาะเมื่อเจ้าของตรวจ external tests/ข้อมูล/โดเมนแล้วและพร้อมอนุมัติ release

หากเลือก `verify` จะตรวจโค้ดอย่างเดียว ทุกครั้งอ้าง commit ที่ Workflow checkout จริง ชุด release candidate นี้ไม่ยอมเปิดรับเงินจริงผ่าน Workflow ต้องมีการพัฒนา/ตรวจรับ provider Sandboxและอนุมัติการเปิดเงินจริงแยกตาม DEPLOY-TH.md

## ทดสอบและ Rollback

`actionlint` ตรวจ YAML/expressions/reusable workflow/composite inputs; Unit tests ตรวจ guard กรณี Team/Project/Root/Repo/Domainผิด, envรับเงินจริง, URLปลอม, deploymentคนละcommit และนโยบายอนุมัติผิด

หลังได้ URL จริง Workflowทำ smoke testอัตโนมัติ แต่ไม่ได้แทน Supabase Storage/provider/SMTP/physical device acceptance จึงต้องอ่าน TEST-REPORT.md ประกอบ ก่อน promoteเก็บ Deployment IDก่อนหน้าไว้ หาก rollbackให้ทำเฉพาะProjectร้านค้าและปิดรับเงินก่อน ไม่ drop ตารางหรือเปลี่ยนDNSของเว็บหลัก

Required reviewers ของ environment ร้านค้าต้องมีบัญชี `Metmetza88` เพียงบัญชีเดียว เพราะ GitHub ยอมรับการอนุมัติจาก reviewer คนใดคนหนึ่งในรายการ กำหนด Deployment branch policies เป็นชนิด `branch` เท่านั้น ไม่อนุญาต tag หรือ wildcard
