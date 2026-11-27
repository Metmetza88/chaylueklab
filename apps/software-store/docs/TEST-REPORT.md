# ผลทดสอบจริง — 0.2.0-rc.3 / 2026-11-26

[GitHub Actions run45882142018](https://github.com/Metmetza88/chaylueklab/actions/runs/45882142018) ของ PR head `630909534cddee87c1f472f228681cc2fed298fa` ผ่านครบ บน Node22.23.5 GitHubทดสอบ checkoutแบบ PR merge commit จึงเก็บทั้ง `source_commit`/`checkout_commit` และ `head_commit` ไว้ในหลักฐาน ไม่ถือว่าเป็นการ mergeเข้าmain

| รายการ | ผลจริง |
|---|---|
| TypeScript / ESLint / actionlint | ผ่าน |
| Dependency install / audit | npm ciผ่าน; auditพบ0ช่องโหว่ตามregistry ณเวลาตรวจ |
| Next.js production build | ผ่าน 15.5.29 |
| Unit / Security | **59 passed** |
| Integration / RLS / transactions | **24 passed** บน PostgreSQL17 + GoTrue + PostgREST และ Storage APIจริง |
| Private Storage API1.98.6 | **12 passed** ใช้ file backendจริง ไม่ใช่ schema fixture |
| Playwright production | **87 passed, 21 skipped, 0 failed**; browserประมาณ1นาที |
| Responsive | public16หน้าและauthenticated Owner Admin ครบ Desktop/iPhone layout/Android/Tablet บนChromium ไม่มีpage overflow |
| Thai PDF | ตัวอักษรไทย/อังกฤษ/เลขใบสมัคร/ปี/ยอดเงินผ่าน text extraction และตรวจภาพ render; browserดาวน์โหลดPDFผ่าน |
| Source packages | สองแพ็กเกจผ่านCRC/SHA/secret exclusions และTypeScriptจากsourceที่แตกแยก ใช้installed dependenciesร่วมกัน; manifest/ผลตรวจอยู่ในRepository |

หลักฐานดาวน์โหลดจาก CI artifactจริง ตรวจ SHA-256ตรงกับGitHub `ab8b256bb092090b3f08f1a94e203283ed23a381aff7d4578a3352e05b562ae7` แล้วคัดรายงานสามไฟล์เข้าdocs: INTEGRATION-RESULTS.json, STORAGE-RESULTS.json, E2E-RESULTS.json สรุปใน CI-RESULTS-20261126.json ไม่มีcredentials/signed URLs/raw browser stateในartifact

21 skipped คือ7 workflowที่เปลี่ยนข้อมูลรันเฉพาะDesktop ไม่รันซ้ำอีก3viewport ส่วนresponsive/authenticated admin layoutและpublic interactionsรันครบ4viewport ไม่ใช่ข้ามtestsที่ล้มเหลว

ก่อนรวมโค้ด MET Attendance demo มี CI เพิ่มจาก source3f3dd39 สำเร็จแล้ว กำลังรวบรวมผลของ commit ส่งมอบล่าสุด ไม่อ้างผล6309095ว่าเป็นผลของ commit ใหม่โดยอัตโนมัติ

## Workflow ที่ตรวจได้จริง

- Signup/login/sessionกับGoTrueจริง (auto-confirmเฉพาะtest stack), checkoutราคาServer, atomic order, forged/wrong amount/duplicate signed Sandbox event, grant และ receipt PDF
- Download ZIPจากprivate Storageจริงหลังชำระเงิน ตรวจbytes/hashตรงmetadata ไม่มีgrant/ถูกrevokeต้อง403 และอีกผู้ใช้ดาวน์โหลดไม่ได้
- อัปโหลดสลิปสมมติจริงผ่านหน้าorders ปฏิเสธรูปซ้ำและลบไฟล์ของรายการที่ถูกปฏิเสธ ผู้ซื้อเข้าAdmin slip endpointไม่ได้
- เจ้าของเปิดดูสลิปprivate ยืนยันยอดผิดแล้วไม่เกิดgrant แก้ยอดใหม่ผ่านหน้าAdminแล้วได้grantในSandbox ไม่ใช่การตรวจธนาคาร/สลิปด้วยAPIภายนอก
- สมัครเรียน/อัปโหลดเอกสารสมมติ/private document URL/PDF/เจ้าหน้าที่ตรวจ/CSV จริง และปฏิเสธ SchoolAdmin/export/PDF/documentข้ามโรงเรียน
- AdminอัปโหลดZIPที่มี.env.localถูกปฏิเสธ ZIPถูกต้องถูกเก็บจริงแต่ยังไม่activate replacementที่ไม่ตรวจรับ
- anonและauthenticatedที่ไม่มีสิทธิ์อ่าน/เขียน/list/sign private objectsไม่ได้ แม้มีlegacy permissive policy; bucket legacyยังทำงาน
- Signed URLตรวจsignature/bytes/หมดอายุที่origin ลบobjectแล้วURLเข้าถึงไม่ได้ ตรวจMIME/ขนาดไฟล์และcache metadataจากการupload
- Coupon race, bank reference/slip deduplication, role/VIP escalation denial, refund/revoke, rate limits, audit/outbox leases/daily idempotency และrelease attestation

## สิ่งที่พบและแก้ระหว่างทดสอบ

StorageAPIใหม่ปฏิเสธการลบmetadataด้วยSQL จึงปรับfixtureให้upload/removeผ่านAPI ไม่ปิดprotect_delete เติมschema/table privilegesของservice_roleในtest bootstrapให้ครบ จากนั้นfull integration23และStorage12ผ่าน

เมื่อServerคืนvalidation error Reactฟอร์มเดิมล้างข้อมูลที่กรอก ตรวจซ้ำด้วยbrowserได้version/changelogว่างจริง แก้ActionFormให้รักษาค่าเมื่อerrorและresetเมื่อsuccess Local reproductionและCI admin ZIP/manual paymentยืนยันผ่าน ดู FORM-RETENTION-20261126.json

ตรวจ ZIP guardเพิ่มให้ปฏิเสธ.env.local/.env.production, credential/Git/Vercel state รวมWindows absolute path และยังรับ.env.exampleสำหรับติดตั้งได้ Package scriptไม่ตามsymlinkหรือรวมdependency/build directories

## ขอบเขตที่ยังไม่ผ่านการตรวจรับ

- Hosted Supabase/Smart CDN: CIเป็นorigin/file backend ไม่ใช่Cloud CDN การอัปโหลดตั้งcacheControl=0และตรวจmetadataแล้ว signed responseของlocal serviceไม่มีCache-Control header จึงต้องตรวจHosted/CDNจริงแยก
- Vercel Preview สร้างสำเร็จ READY แล้ว ตรวจ39 HTTP routes และ Runtime error/fatal logs ในช่วงทดสอบไม่พบรายการที่ตรงเกณฑ์ ดู VERCEL-PREVIEW-20261127.json พบ store.chaylueklab.com ถูกเชื่อมอยู่แล้วโดยการเปลี่ยนแปลงภายนอกงานนี้ ตรวจอ่านโดยไม่เปลี่ยน DNS หรือ promote Production แต่ฐานข้อมูลบน Hosted ยังไม่ตั้งค่า
- SMTP/recovery delivery, hosted backup/restore/advisors, Safari/iPhone/Android/Windowsอุปกรณ์จริง
- PromptPaymerchant config/การตรวจธนาคารจริง/owner acceptance ยังไม่เปิดเงินจริง Provider APIเป็นทางเลือกเมื่อได้รับสิทธิ์ ไม่อ้างว่าtrusted bridgeตรวจภาพสลิปเอง
- Sourceแรกสองระบบเป็นRC อีก13ระบบยังComing Soon ไม่มีimplementationพร้อมขาย

## รันทดสอบ

ดู REAL-STORAGE-TESTS-TH.md สำหรับfull service และคำสั่ง Local/CI เครื่องนี้พื้นที่ไม่พอสำหรับStorage imageจึงใช้CIสำหรับfull API; reduced mode `TEST_STORAGE_API=false` เป็นschema fixtureเท่านั้น ห้ามนับว่าได้ทดสอบStorage API

บนLocalยังตรวจหลังแก้ฟอร์มได้59unit/23integrationแบบreduced,4authenticated workflows และ4Owner layoutsจริง ผลCIข้างต้นเป็นfull serviceที่ผ่านแยกแล้ว ข้อมูลทุกชุดเป็นสมมติ ไม่ได้แก้DBของเจ้าของหรือส่งข้อมูลเด็กจริง

## การตรวจเว็บสาธารณะ 2026-11-27

Playwright บน https://store.chaylueklab.com ผ่าน **88/88, 0 skipped, 0 failed** บน Desktop/iPhone layout/Android/Tablet ด้วย Chromium เวลาประมาณ2.2นาที บน deployment source3f3dd39 ดู LIVE-PUBLIC-TESTS-20261127.json รวม18หน้า, gallery/filter, Admission Demo/PDF, Attendance Demo แยกโรงเรียน/วัน/คาบ/CSV และ unauthorized APIs

รอบแรกผ่าน68/76 อีก8กรณีเป็น ECONNREFUSED เพราะ APIRequestContext ไม่ใช้ network proxy ของเครื่อง เพิ่ม PLAYWRIGHT_PROXY_SERVER แบบ opt-in แล้วกรณี PDF/API denial ผ่าน2/2 และรันทดสอบครบชุดใหม่ผ่าน88/88 ไม่มีการผ่อน RLS/auth หรือแก้ assertions ให้ข้ามข้อผิดพลาด

ชุดนี้ยืนยันหน้าร้านสาธารณะเท่านั้น health ยังระบุ database_configured=false/payment_mode=disabled ไม่มี Hosted auth/checkout/student workflow หรือเงินจริงถูกทดสอบ ไม่ใช่อุปกรณ์ Safari/iPhoneจริง
