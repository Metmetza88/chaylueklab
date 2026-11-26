# CHAYLUEKLAB SOFTWARE STORE — สถานะและหลักฐานจริง

อัปเดต 2026-11-26 UTC • WORAMET AI LAB

**สถานะ: Source พร้อมตรวจรับเป็น Release Candidate; ยังไม่พร้อมเปิดขาย Production**

พัฒนาร้านค้า Next.js/TypeScript แยกใน `apps/software-store` และ source ของ MET School Pro + MET Admission พร้อม Local database/auth/payment tests แล้ว สินค้าทั้ง15รายการยัง Coming Soon ไม่มีสินค้าที่ผ่าน external acceptance พร้อมจำหน่ายในขณะนี้

## สิ่งส่งมอบตามคำขอ

| รายการ | ผล/หลักฐาน |
|---|---|
| 1. เว็บไซต์ Production | ยังไม่มีการเปิด `store.chaylueklab.com` ไม่มี DNS ถูกเปลี่ยน |
| 2. Preview URL | ยังสร้างไม่ได้ Vercel create_project คืน403 forbidden; ไม่มี Vercel deployment/build/runtime logs ให้อ้าง |
| 3. GitHub Branch / PR | [Branch เดิม](https://github.com/Metmetza88/chaylueklab/tree/feature/woramet-school-store-20261124) Push แล้ว; [Draft PR #55](https://github.com/Metmetza88/chaylueklab/pull/55) |
| 4. Admin | route `/admin`; โรงเรียน `/school-admin/<slug>` ยังไม่ deploy สาธารณะ |
| 5. ผลทดสอบ | [TEST-REPORT](apps/software-store/docs/TEST-REPORT.md): Unit53, Integration23, Playwright80passed/12plannedskips/0failed, TypeScript/ESLint/Production Build ผ่าน |
| 6. พร้อมขายจริง | **0 ระบบ** เพราะยังต้องตรวจ Storage/provider Sandbox/SMTP/อุปกรณ์จริงและเจ้าของตรวจรับ |
| 7. ยังไม่เสร็จ | สองระบบแรกเป็น RC; อีก13ระบบเป็น roadmap ดูตารางด้านล่าง |
| 8. ติดตั้งภาษาไทย | [DEPLOY-TH](apps/software-store/DEPLOY-TH.md), [คู่มือโรงเรียน](apps/software-store/docs/SCHOOL-USER-GUIDE-TH.md) |
| 9. iPhone | [คู่มือ Admin ผ่าน iPhone](apps/software-store/docs/IPHONE-ADMIN-TH.md); responsive ผ่าน Chromium simulation ยังไม่ใช่ Safari device test |
| 10. ค่าใช้จ่าย | [MONTHLY-COSTS](apps/software-store/docs/MONTHLY-COSTS.md) งบฐานตัวอย่าง USD45/เดือน ไม่ใช่ใบแจ้งหนี้จริง ไม่สมัครบริการเสียเงิน |
| 11. Security | [SECURITY](apps/software-store/docs/SECURITY.md), [Dependency Audit](apps/software-store/docs/DEPENDENCY-AUDIT.json) registry auditพบ0ช่องโหว่ ณเวลาตรวจ ไม่ใช่คำรับรองว่าไร้ช่องโหว่ทุกชนิด |
| 12. เจ้าของดำเนินการ | [OWNER-ACTIONS](apps/software-store/docs/OWNER-ACTIONS.md) และคำถาม staging/provider ที่ส่งไว้ ไม่มีการขอ secret ผ่านแชต |

## รายการผลิตภัณฑ์

| โปรแกรม | สถานะ source | จำหน่าย |
|---|---|---|
| MET School Pro | 0.2.0-rc.2: school website/news/settings/roles/source/schema/manuals/tests/ZIP | Coming Soon |
| MET Admission | 0.2.0-rc.2: school website/rounds/applications/documents/review/ThaiPDF/CSV/dashboard/roles/source/schema/manuals/tests/ZIP | Coming Soon |
| MET Student | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Attendance | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Schedule | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Grades | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Assignment | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Certificate | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Sport | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Inventory | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET E-Office | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Library | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Parent | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET School Shop | ยังไม่พัฒนา implementation สินค้า | Coming Soon |
| MET Exam AI | ยังไม่พัฒนา implementation สินค้า | Coming Soon |

ZIPสำหรับตรวจรับอยู่ใน `apps/software-store/dist/` สองแพ็กเกจพร้อม manifest และ SHA-256 ดู [RELEASE-MANIFEST](apps/software-store/docs/RELEASE-MANIFEST.json) ไฟล์ ZIP ไม่ commitลงpublicrepoหรืออัปโหลดStorageจริงจนเลือกปลายทางที่อนุญาต

## การสำรองและต้นฉบับ

- Repositoryเดิม `Metmetza88/chaylueklab` เป็น public ไม่สร้าง Repository ใหม่ ไม่เปลี่ยน visibility
- Branchเริ่มต้น `feature/woramet-school-store-20261124` ที่ `e493777066eee586a0fdeae54b04dda9e1ba64bb`; main ที่ตรวจ `bbed5bd421a2c94b63000f4f64c26c4216af1ebf`
- สำรอง Git ทุกrefก่อนแก้: `/workspace/scratch/store-backups/chaylueklab-before-store.bundle` อยู่ภายนอก Git
- ZIPชุดแรกสองไฟล์เหมือนกัน SHA256 `93c126d56b4a94e63f5a58f8ed6523752323b849750bc4dc0a728febacaf4702`
- ZIPล่าสุดใช้เป็นฐาน SHA256 `e42f3204e6d7984fc07f78e95ef1d519a43f2d910f6ef7000f3298d1f5c80b38` สำเนาแตกไว้ `/workspace/scratch/woramet-latest/woramet-store`
- [ตรวจทุกไฟล์ต้นฉบับ](apps/software-store/docs/SOURCE-REVIEW.md), [SHA256รายไฟล์](apps/software-store/docs/ORIGINAL-FILE-INVENTORY.json)
- ไม่มีการแก้ตาราง/ข้อมูล hosted Supabase จึงไม่มีการอ้างว่าทำ Production DB backupแล้ว คู่มือบังคับสำรอง/restoreก่อนติดตั้งจริง
- ไม่แก้ LIFE OS, ร้านเสื้อผ้า, LINE OA หรือ rootเว็บไซต์หลัก มีเพียงแอปใหม่ workflow CIใหม่และเอกสารสถานะ ไม่ merge เข้า main

## หลักฐานการพัฒนาและทดสอบ

- เพิ่ม additive migration ชื่อ `20261124023043_isolated_store_school_platform.sql` สร้างด้วย SupabaseCLI migration new ใช้ store_*/school_* และ store_private แยกจากตารางทั่วไป ไม่มีการแก้ auth trigger เดิม
- ราคาคำนวณใน DB, atomic checkout/payment, coupon locking, idempotency, transaction reference/slip hashes, grants/refund, audit/outbox และ live gate
- Auth getUser/RLS/role checks/private storage policy/rate limits/file validation/CSV escaping และ server-only service key
- Sourceรูปแบบโรงเรียนติดตั้งแยกได้ด้วย APP_VARIANT=school; ทดสอบ root redirect/ข้อมูลจริงในLocal/phone390pxเพิ่มเติมแล้ว
- Demoไม่รับชื่อ/เบอร์/ไฟล์จริง ใช้ค่าคงที่และ browser memory ไม่ส่งใบสมัครขึ้น Server ภาพ `public/screenshots` ถ่ายจากระบบทดลองที่รันจริงพร้อมป้ายข้อมูลสมมติ
- Unit53/31, DB/Auth/RLS/transaction23/23, PlaywrightProduction80passed+12plannedskips ผ่าน ดูรายงานและ JSONหลักฐาน ไม่มีการนับ testsที่ยังไม่ได้รันเป็นผ่าน
- public sweepชุดแรก timeoutเมื่อรวม16หน้าต่อtest; แบ่งต่อหน้าและใช้ Production Build แล้ว ต่อมาป้าย Sandboxทำให้selector Demoกำกวม แก้selectorและรันครบใหม่ผ่าน
- Local Supabaseเต็มชุด/StorageAPIติดพื้นที่ Docker ไม่พอ จึงใช้ PostgreSQL17+GoTrue+PostgRESTจริงร่วมกับ storage schema fixture; **ยังไม่ทดสอบ Storage service/SignedURL expiry จริง**
- ก่อนPushสแกนstagedfilesหารูปแบบsecret: ผ่าน ไม่มี .env.test/auth.env/rest.env/test accounts ใน Git หรือ ZIP
- Commit `6fc13e2` และ `5213883` Pushสำเร็จ พร้อม transaction release/support และรายงานผล; [Draft PR #55](https://github.com/Metmetza88/chaylueklab/pull/55) เปิดแล้ว ไม่ merge
- CI ของ PR เป็นการตรวจแยกจากผล Local ต้องดูสถานะ commit ล่าสุดใน GitHub Actions ก่อน merge

## การเชื่อมต่อที่ตรวจได้จริง

| บริการ | ผล |
|---|---|
| GitHub | อ่าน/Push branchเดิมได้ Push branch เดิมได้; การอ่าน Variables/แก้ Environment คืน403 แม้ repo metadata รายงาน admin; ยังไม่ merge |
| Vercel | เห็น team `team_kA0EAug4JrrTT6ZIc54RXcmL`; list_projectsทั้งteam/personalคืนว่าง; POST /v11/projects ชื่อ chaylueklab-software-storeคืน403 forbidden ไม่มี projectถูกสร้าง |
| CLI fallback | ตรวจ Vercel CLI67 ผ่านคำสั่ง help ได้ แต่ไม่มี VERCEL_TOKEN หรือ CLI auth file ในWorkspace จึงไม่มี credentialสำรองสำหรับสิทธิ์ที่ขาด |
| Supabase | เห็น CHAYLUEKLAB Reminder Backend (`bxaplhrunxiadjsdobyl`) และ Metmetza88's Project (`yobymeygbfiwlngmwjcn`); ตรวจ public table metadata ของระบบเดิมแล้ว ไม่เขียน hostedDB |
| Payment provider | ยังไม่มีบัญชี/APIที่ได้รับอนุญาต ทดสอบเฉพาะ signed trusted bridgeบนLocalSandbox |
| Command Center/Income Assistant/LINE | เตรียม protocolและoutboxแล้ว ยังไม่มี authorized endpoint/secret/recipient/scheduler จึงไม่ได้ส่งข้อความจริง |

## ข้อจำกัดสำคัญก่อนขาย

Repositoryเดิมเป็น **public** SourceในBranchอ่านได้สาธารณะ PrivateZIPไม่ได้ทำให้SourceในGitHubเป็นความลับ ต้องให้เจ้าของตัดสินใจvisibility/licenseก่อนขายแบบปิดซอร์ส โดยประเมินผลต่อPages/Integrationเดิมก่อนเปลี่ยน

VIPมีสิทธิ์/วันหมดอายุ/ส่วนลดและadminจัดการแล้ว แต่ยังไม่เปิดขายแผนสมาชิก/ต่ออายุอัตโนมัติ ราคาแผน การเชื่อมSMTP การส่งสิทธิ์ทางข้อความ และ13สินค้าที่เหลือยังต้องพัฒนาหรือรับข้อมูลเพิ่ม ไม่ระบุว่าทุกฟีเจอร์ครบ Productionแล้ว

**ไม่เปิดรับเงินจริง ไม่เปลี่ยนDNS และไม่ประกาศพร้อมขายจนผ่าน external tests และเจ้าของอนุมัติ**

## งานต่อเนื่อง 2026-11-26
- ตรวจไฟล์แนบใหม่9ไฟล์เทียบSHAและโครงสร้าง ZIP ไม่ใช้รายงานพร้อมขายที่ไม่มีหลักฐานทดสอบ ดู ATTACHMENT-REVIEW-20261126.json
- CI commit c7b1ecb ผ่าน Software store checks, Quality และ CodeQL จริง: https://github.com/Metmetza88/chaylueklab/actions/runs/45321105456
- แก้ PDF ที่พบจากการเรนเดอร์ภาพจริงว่าภาษาอังกฤษและตัวเลขไม่ครบ ใช้ static TTF แยกจากฟอนต์เว็บ และตรวจภาพหลังแก้แล้ว
- เพิ่ม Workflow main/manual, Node22, read-only permissions, concurrency, pinnedCLI และตัวตรวจTeam/Project/Repo/Root/Domain/Payment/Commit/Approval Policy
- GitHubอ่านEnvironmentsเดิมได้ แต่ PUT environmentใหม่และอ่านVariablesคืน403 ไม่มีการแก้ Environment เดิมหรือสร้าง environmentสำเร็จ
- การDeployยังปิดไว้จนเจ้าของตั้งprotected environments/IDs/tokenและยืนยันProjectร้านค้า ดู docs/CI-DEPLOY-TH.md

## ผลตรวจรับโค้ดล่าสุด 2026-11-26

- Push commit `681e291541e4aa0263cdcbf536421bb2a41c3860` แล้ว [GitHub Actions run45783357503](https://github.com/Metmetza88/chaylueklab/actions/runs/45783357503) **success** บน Node22.23.5: actionlint/TypeScript/ESLint/Unit53/audit0/build/integration23/Playwright80passed+12plannedskips ผ่านทั้งหมด Quality checks และ CodeQL ผ่านเช่นกัน [CI-RESULTS](apps/software-store/docs/CI-RESULTS-20261126.json)
- Source ZIPรุ่น0.2.0-rc.2 ทั้งสองแพ็กเกจตรวจ CRC/SHA-256/ไม่รวม secrets และแตก source ตรวจ TypeScriptผ่านจริง ใช้ dependencyชุดที่ติดตั้งตรวจแล้วร่วมกัน ไม่ใช่ clean installใหม่ทั้งสองชุด
- PDFหลังเปลี่ยน staticfont ตรวจภาพเรนเดอร์และ text extractionผ่านทั้งภาษาไทย/อังกฤษ/เลขที่ใบสมัคร/ปี/ยอดเงิน [หลักฐาน](apps/software-store/docs/PDF-VALIDATION-20261126.json)
- GitHub Workflow Deploy เพิ่มเป็นโค้ดใน PRเท่านั้น ยังไม่อยู่บนmain ไม่ได้ตั้งค่า Environment/Secrets แทนเมื่อ APIคืน403 และยังไม่มี Vercel URL จริง การทดสอบ CIสีเขียวไม่ใช่การเปิดขาย Production

- ตรวจ configกับ applicable fields ของ official Vercel JSON Schemaผ่าน; ปิด `git.deploymentEnabled` เฉพาะ `apps/software-store/vercel.json` ให้ Git Integrationไม่ deployข้าม CI/approval และรวม configใน Source ZIPแล้ว

## งานต่อเนื่อง 2026-11-26 รอบ Storage/ZIP security

- ตรวจ PR55/Branch เดิมแล้ว main ยัง bbed5bd421a2c94b63000f4f64c26c4216af1ebf ไม่แก้หรือ Deploy เว็บไซต์หลัก
- Vercel context ยังมี team เดิม plan Hobby, linkedProjects ว่าง ไม่มี Project ร้านค้าที่ตรวจยืนยันได้ ยังไม่ลอง POST ที่ถูกปฏิเสธซ้ำโดยไม่มีการเปลี่ยนสิทธิ์ และไม่ซื้อ/upgrade plan
- Supabase ยังมีสอง Project เดิม ไม่มี staging ใหม่ที่ระบุ ไม่แก้ hosted schema/ข้อมูล
- สำรอง Git ก่อนแก้รอบนี้ไว้ /workspace/scratch/store-backups/before-storage-20261126.bundle
- แก้ ZIP credential-path validation และ private-file cache settings; Local TypeScript/ESLint/Build/Unit59/Integration23 ผ่าน (Local ยังใช้ Storage schema fixture)
- Storage API image ยังเกินพื้นที่เครื่องแม้คืน cache จึงเพิ่ม full Storage job บน GitHub Actions พร้อมรายงาน current-run ที่ไม่รวม secrets; ผลชุดใหม่ยังรอ CI จริง ห้ามนับว่าผ่านล่วงหน้า
- กำลังเตรียม RC.3 สินค้าทั้ง15ยัง Coming Soon และยังไม่มี Preview/Production URL

- ทดสอบสร้าง Vercel Project แบบไม่เชื่อม GitHubเพื่อแยกสาเหตุแล้ว ยัง POST /v11/projectsคืน403 “You don't have permission to create the project.” ไม่มี projectถูกสร้าง ไม่ retryคำขอเดิม ไม่ถือว่าเปลี่ยน OAuthแล้วจะหายเอง CLIไม่มี token/auth fileสำรอง
- CI รอบแรกของ full Storage เริ่ม service v1.98.6จริงได้แล้ว แต่ fixture ลบ metadataผ่านSQLถูก protect_delete ปฏิเสธ แก้ให้ fixture upload/removeผ่าน Storage APIโดยไม่ปิดตัวป้องกัน รายงานไม่นับชุดนี้ว่าผ่านก่อน rerun
- เพิ่ม authenticated Admin responsive check: Local Desktop/iPhone layout/Android/Tablet ผ่าน4กรณี ไม่มี page overflow และเข้าถึง controlsได้ (Chromium simulation ไม่ใช่อุปกรณ์จริง)
