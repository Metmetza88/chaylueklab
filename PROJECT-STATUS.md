# CHAYLUEKLAB SOFTWARE STORE — สถานะและหลักฐานจริง

อัปเดต 27 พฤศจิกายน 2026 (Asia/Bangkok) • WORAMET AI LAB

**หน้าร้านสาธารณะเปิดได้แล้ว; ระบบซื้อขายและโรงเรียนบน Hosted ยังไม่พร้อมตรวจรับ Production**

แอป Next.js/TypeScript แยกใน `apps/software-store` ใช้ Repository และ Branch เดิม ไม่แก้ main หรือเว็บไซต์หลัก Source ของ MET School Pro และ MET Admission เป็น Release Candidate สินค้าทั้ง15รายการยัง Coming Soon; MET Attendance มี Demo ข้อมูลสมมติแต่ยังไม่มี backend สินค้าพร้อมขาย

## สิ่งส่งมอบ

| รายการ | ผลจริง |
|---|---|
| เว็บไซต์ | [store.chaylueklab.com](https://store.chaylueklab.com) เปิดได้ เป็นแคตตาล็อก/Demo ที่ยังไม่เชื่อม Supabase พบโดเมนผูกอยู่แล้วและตรวจอ่านเท่านั้น ไม่เปลี่ยน DNS หรือ promote Production ในงานนี้ |
| Preview | [Vercel Preview](https://chaylueklab-software-store-azoqphrr9-waramatw2546-4532.vercel.app) READY จาก sourceef123d5; คง SSO ไว้ ดูหลักฐาน Preview และ commit ล่าสุดใน docs/VERCEL-PREVIEW-20261127.json |
| GitHub | [Branch เดิม](https://github.com/Metmetza88/chaylueklab/tree/feature/woramet-school-store-20261124) และ [Draft PR55](https://github.com/Metmetza88/chaylueklab/pull/55) ยังไม่ merge main |
| Admin | [Admin](https://store.chaylueklab.com/admin) redirect ไป login ตามสิทธิ์ ยังใช้บัญชี Hosted ไม่ได้จนตั้ง Supabase/Auth; ระบบจริงผ่าน CI และมีภาพจากฐานข้อมูล Local สมมติ |
| ผลทดสอบ | [TEST-REPORT](apps/software-store/docs/TEST-REPORT.md), CI-RESULTS และ JSON หลักฐานแยก source commit; CI และ Live storefront tests เป็นคนละชุด |
| พร้อมขายจริง | **0 ระบบ** สองระบบแรกเป็น RC.3 และอีก13ระบบยังไม่ผ่านการตรวจรับผลิตภัณฑ์ |
| ติดตั้งภาษาไทย | [DEPLOY-TH](apps/software-store/DEPLOY-TH.md), [คู่มือโรงเรียน](apps/software-store/docs/SCHOOL-USER-GUIDE-TH.md) |
| iPhone | [คู่มือ Admin](apps/software-store/docs/IPHONE-ADMIN-TH.md); responsive ทดสอบด้วย Chromium viewport ยังไม่ใช่ Safari/iPhone อุปกรณ์จริง |
| ค่าใช้จ่าย | [MONTHLY-COSTS](apps/software-store/docs/MONTHLY-COSTS.md) งบฐานตัวอย่าง USD45/เดือน ไม่ใช่ใบแจ้งหนี้จริง ไม่ซื้อหรืออัปเกรดแผน |
| Security | [SECURITY](apps/software-store/docs/SECURITY.md), dependency audit และ RLS/Storage/payment/browser checks จริง ไม่มีการรับรองว่าไร้ช่องโหว่ทุกชนิด |
| เจ้าของดำเนินการ | [OWNER-ACTIONS](apps/software-store/docs/OWNER-ACTIONS.md): ระบุ Supabase staging, ตั้งค่า secret โดยตรงในบริการ, GitHub protected environments และตรวจรับก่อนเปิดเงินจริง |

## ผลิตภัณฑ์

| โปรแกรม | สถานะ source | จำหน่าย |
|---|---|---|
| MET School Pro | RC.3: เว็บไซต์ ข่าว ตั้งค่า โลโก้ สิทธิ์ ฐานข้อมูล คู่มือ Source ZIP และ tests | Coming Soon |
| MET Admission | RC.3: รอบสมัคร เอกสาร เจ้าหน้าที่ ผลประกาศ PDFไทย CSV Dashboard และ multi-school RLS | Coming Soon |
| MET Student | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Attendance | Interactive Demo ข้อมูลสมมติ แยกโรงเรียน/รายวัน/รายคาบ และส่งออกCSV; backend สินค้ายังไม่พัฒนา | Coming Soon |
| MET Schedule | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Grades | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Assignment | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Certificate | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Sport | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Inventory | ยังไม่มี implementation สินค้า | Coming Soon |
| MET E-Office | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Library | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Parent | ยังไม่มี implementation สินค้า | Coming Soon |
| MET School Shop | ยังไม่มี implementation สินค้า | Coming Soon |
| MET Exam AI | ยังไม่มี implementation สินค้า | Coming Soon |

## การเชื่อมต่อและขอบเขตที่ยังขาด

- Vercel: ยืนยัน Project `chaylueklab-software-store` (`prj_OoLCWchPlUH9UAUKQxDH91omIIG3`) ใน Team `team_kA0EAug4JrrTT6ZIc54RXcmL` ปรับเฉพาะ Project นี้ ใช้ Root `apps/software-store`, Next.js และ Node22 สร้าง Preview จริงและอ่าน Build/Runtime logs ได้ การคืน403ก่อนหน้านี้เป็นประวัติ ไม่ใช่สถานะ Preview ปัจจุบัน
- GitHub: push Branch เดิมได้ การอ่าน Variables/แก้ Environments เคยคืน403 Workflow main/manual อยู่ใน PRและยังไม่เปิด deploy gate ไม่แก้ environments เดิม ไม่ merge main
- Supabase: ตรวจสองบัญชีอีกครั้ง27พฤศจิกายน ยังมีเพียง Reminder Backend และ Metmetza88's Project ที่มีระบบเดิม ไม่มี staging ที่ระบุ จึงไม่เขียน Hosted DB หรือดึง secret ของระบบเดิม
- Payments: health บนเว็บจริงระบุ disabled และ ready_for_live_payments=false Manual PromptPay แบบเจ้าของตรวจธนาคารรองรับใน source และผ่าน Sandbox บน CIแล้ว ยังต้องตั้งผู้รับ/Hosted acceptance/เจ้าของอนุมัติ Provider API เป็นทางเลือกเมื่อมีสิทธิ์
- Automations: transaction outbox/leases/signatures/idempotency เตรียมแล้ว แต่ยังไม่มี receiver/scheduler/secret ที่อนุญาต จึงไม่ส่งข้อความจริงผ่าน LINE หรือบริการอื่น
- Repository เดิมเป็น public: Source ที่ push อ่านได้สาธารณะ Private ZIP ไม่ปิดการอ่าน GitHub เจ้าของต้องตัดสินใจ license/visibility โดยประเมินผลต่อระบบเดิมก่อน ไม่เปลี่ยนเอง
- ZIP สองระบบอยู่ใน `apps/software-store/dist/` พร้อม SHA/CRC ใน RELEASE-MANIFEST และ PACKAGE-VERIFICATION เป็น RC สำหรับตรวจรับ ไม่ใช่ไฟล์ที่เปิดขายแล้ว

## การสำรองและความปลอดภัยในการแก้ไข

สำรอง Git bundles/working patches ไว้ใน `/workspace/scratch/store-backups/` ก่อนรวมการเปลี่ยนแปลง ตรวจ remote ทุกครั้งและ fast-forward งานที่เพิ่มเข้ามา ไม่ force push ไม่สร้าง Repository ใหม่ ค่า main ที่ตรวจคือ bbed5bd421a2c94b63000f4f64c26c4216af1ebf ไม่มี hosted migration หรือข้อมูลเด็กจริงถูกใช้ทดสอบ

## ประวัติการทำงาน

รายการด้านล่างเป็นบันทึกตามเวลา ข้อความ403/ไม่มีPreview/ผลทดสอบเก่าเป็นสถานะ ณเวลานั้น ให้ใช้สรุปด้านบนและหลักฐานล่าสุดสำหรับสถานะปัจจุบัน

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

- Storage API จริงผ่าน12กรณีใน CI run45843265671 รวม private upload/download, permission denial, URL signature/expiry ที่ origin และ bucket MIME/size; integration23ผ่านบน full serviceด้วย แต่รอบนี้ยังมี E2E2ข้อไม่ผ่านจึงไม่ระบุว่า CIทั้งหมดผ่าน
- ตรวจพบฟอร์มล้างข้อมูลเมื่อ Serverคืน validation error จากการทดสอบจริง แก้ ActionFormให้เก็บข้อมูลบนerrorและresetบนsuccessแล้ว Local reproductionหลังแก้ยืนยันค่าคงอยู่ และ Local4 workflow regressionผ่าน กำลังrerunfull CI
- เพิ่มภาพ Localจริงพร้อมข้อมูลสมมติ: Owner iPhone layout, SchoolAdmin และ SchoolPro site พร้อม SHAใน AUTHENTICATED-SCREENSHOTS-20261126.json
- เริ่มต้นด้วย PromptPayแบบเจ้าของตรวจยอดเข้าธนาคารด้วยตนเองได้ตามขอบเขตเดิม APIตรวจสลิป/ธนาคารอัตโนมัติเป็นทางเลือกเมื่อมี APIอนุญาต ไม่ถือว่าAPIproviderเป็นเงื่อนไขของ Sourceโปรแกรมโรงเรียนทุกระบบ แต่ร้านค้ายังต้องผ่าน Sandbox/Hostedตรวจรับและเจ้าของอนุมัติเงินจริงก่อน

## ผลยืนยัน RC3 ล่าสุด — 2026-11-26

- Commit cec8ca66c074f0e1f5e7cb0cdf6d26000400023a [CI run45846383151](https://github.com/Metmetza88/chaylueklab/actions/runs/45846383151) **success**: Node22.23.5, actionlint/install/TypeScript/ESLint/audit0/build, Unit59, Integration23, Storage APIจริง12, Playwright86passed/18plannedskips/0failed รวมOwner authenticated responsive4viewport QualityและCodeQLผ่าน
- ดาวน์โหลดartifact15130928461ผ่านGitHub connector ตรวจSHA256ตรงGitHubแล้ว ได้INTEGRATION/STORAGE/E2E JSONที่ผูกhead/checkout commitจริง ไม่มีsecret/signed URL/raw browser stateในรายงาน
- Appแก้ZIPcredential validation, private-cache metadataและvalidation form data lossแล้ว Workflowสลิปจริงบนprivate Storage/ยอดผิด/สลิปซ้ำ/แก้ยอด/เปิดgrant/ดาวน์โหลดทำงานในSandbox ข้อมูลเด็กและธุรกรรมทั้งหมดเป็นสมมติ
- ยังไม่มีPreview/ProductionเพราะVercel403/ไม่มีCLIcredential และGitHubSettingsVariables403 Supabase stagingยังไม่ได้รับลิงก์ตอบกลับ ไม่เปลี่ยนmain/DNS/Hosted DB ไม่รับเงินจริง สองผลิตภัณฑ์ยังRC.3 อีก13ยังroadmap

- สร้างSource ZIP RC3สองแพ็กเกจ ตรวจCRC/สิ่งส่งมอบ/secret exclusions/SHAและแตกSourceตรวจTypeScriptผ่านจริง (แชร์installed dependencies ไม่ได้อ้างclean installแยกสองครั้ง) ดู RELEASE-MANIFEST.json/PACKAGE-VERIFICATION-20261126.json

## ผลตรวจเพิ่มเติม 27 พฤศจิกายน 2026

- รับการเปลี่ยนแปลงใน Branch เดิมถึง aa44915 ด้วย fast-forward เก็บการแก้ผลรับสมัคร/คิวตรวจ, Attendance Demo, procurement guide, gallery และลิงก์กลับหน้าโรงเรียนไว้ ไม่เขียนทับงานที่เพิ่มเข้ามา
- พบ Project ร้านค้าที่มีอยู่และ domain store.chaylueklab.com verified แล้ว สร้าง Preview CEC และ6309095 เป็น READY ผ่าน connector การสร้าง/ผูกโดเมนและ Production6309095/3f3dd39 เป็นสิ่งที่พบจากงานภายนอก ไม่ใช่การ promote หรือเปลี่ยน DNS ใน session นี้
- ตรวจ39 HTTP routes บน Preview6309095 รวม15สินค้า ผลปกติ/404/401ตามสิทธิ์ Buildสำเร็จ Runtime error/fatal logs ช่วงตรวจไม่พบรายการที่ตรงเกณฑ์ คง SSO ไว้
- Playwright เว็บจริง source3f3dd39 ผ่าน88/88 ครบ4viewports หลังตั้ง network proxy เฉพาะเครื่องทดสอบ ผลรอบแรก68/76ที่ติดnetworkและผลซ้ำบันทึกแยกชัดเจนใน LIVE-PUBLIC-TESTS-20261127.json
- ตรวจ Supabase ทั้งสองบัญชีอีกครั้ง ยังไม่มี staging ที่ระบุ ไม่แก้ Reminder Backend หรือ Project ทั่วไปเพื่อเดาว่าเป็นฐานข้อมูลร้าน
- ตรวจ Plugin Management: สิทธิ์ ChatGPTของ Vercel/GitHub อนุญาตการทำงาน แต่ไม่ถือเป็นสิทธิ์ API/Settings ของบริการ ตรวจ TinyFish wallet แบบอ่านอย่างเดียว ไม่หักเครดิต/เติมเงิน/เปลี่ยน auto-reload ไม่มีงานเสียงหรือส่งข้อความออกผ่าน ElevenLabs
- ใช้ Master Knowledge snapshot เป็นข้อมูลประกอบ และตรวจสิ่งที่เปลี่ยนจาก connector/Repository จริง ไม่ใช้ข้อความ historicalว่าเป็นผลทดสอบปัจจุบัน

## หลักฐานส่งมอบล่าสุด — 27 พฤศจิกายน 2026

- Commit `ef123d5c261e02ee6ddc6becaccb1d642b5947b6` [CI run45956592838](https://github.com/Metmetza88/chaylueklab/actions/runs/45956592838) success: Node22.23.5, TypeScript/ESLint/actionlint/npm ci/audit0/build, Unit59, Integration24, Storage API12, Playwright99passed/21plannedskips/0failed; QualityและCodeQLผ่าน
- CI artifact15179296914 ดาวน์โหลดและตรวจSHA256ตรงGitHubแล้ว รายงานทั้งสามผูก head/checkout commitจริง
- Preview `https://chaylueklab-software-store-azoqphrr9-waramatw2546-4532.vercel.app` เป็น READY, target Preview, sourcecommitตรง ทดสอบ42 HTTP checksผ่าน ไม่พบ error/fatal logsที่ตรงเกณฑ์ในช่วงตรวจ คงSSOและไม่มีDBHosted/เงินจริง
- Source ZIPสองระบบแตกตรวจTypeScriptผ่านจริงกับinstalled dependenciesร่วมกัน ไม่ใช่clean installแยกสองครั้ง สถานะRC.3/ready_for_sale=false รายละเอียดhashสุดท้ายใน RELEASE-MANIFEST/PACKAGE-VERIFICATION
- mainยัง bbed5bd421a2c94b63000f4f64c26c4216af1ebf ไม่ merge/เปลี่ยนDNS/เปิดเงินจริง/ซื้อแผน/แก้Hosted DB ขั้นต่อไปที่ต้องใช้เจ้าของคือระบุ Supabase stagingที่อนุญาตและตั้งค่าที่จำเป็นในบริการโดยตรง ไม่ส่งsecretผ่านแชต
