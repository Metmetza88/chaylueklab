# ผลทดสอบจริง — 0.2.0-rc.3 / 27 พฤศจิกายน 2026

[GitHub Actions run45956592838](https://github.com/Metmetza88/chaylueklab/actions/runs/45956592838) **success** ของ PR head `ef123d5c261e02ee6ddc6becaccb1d642b5947b6` บน Node22.23.5 GitHub checkout เป็น PR merge commit `7200473112c721e97f9dc0f71acfaacd6227e788` หลักฐานเก็บ head และ checkout แยกกัน ไม่ใช่การ merge เข้า main

| รายการ | ผลจริง |
|---|---|
| npm ci / TypeScript / ESLint / actionlint | ผ่าน |
| Dependency audit | 0ช่องโหว่ตาม registry ณเวลาตรวจ |
| Next.js production build | ผ่าน Next15.5.29 |
| Unit / Security | 59 passed |
| Integration / Auth / RLS / transactions | 24 passed บน PostgreSQL17, GoTrue และ PostgREST |
| Private Storage API1.98.6 | 12 passed ใช้ file backend จริง ไม่ใช่ schema fixture |
| Playwright ใน CI | 99 passed, 21 planned skips, 0 failed; framework errors0 |
| Responsive ใน CI | public18หน้าและ Owner Admin ที่ loginแล้ว ครบ Desktop/iPhone layout/Android/Tablet บน Chromium ไม่มี page overflow |
| เว็บสาธารณะ | 88 passed, 0 skipped, 0 failed บน store.chaylueklab.com source3f3dd39 ดู LIVE-PUBLIC-TESTS-20261127.json |
| Preview | READY จาก headด้านบน; 42 HTTP smoke checks ผ่าน รวม15สินค้าและ Demo3ระบบ; healthปิดรับเงินจริง |
| Source ZIP | CRC/required files/credential exclusions/SHA และ extracted TypeScript สองชุดผ่าน ใช้ installed dependencies ร่วมกัน ไม่ใช่ clean installแยกสองรอบ |

CI artifact15179296914 ตรวจ SHA-256 ตรง GitHub: `830fdfde46eccb38b99042735df7b48d54c0ca9f2f7b8dc09ec02d658b4eb051` แล้วคัด INTEGRATION/STORAGE/E2E JSONเข้าdocs ไม่มี credentials, signed URLs หรือ raw browser state ใน artifact Quality checks และ CodeQL ของ headนี้ผ่านเช่นกัน

21 skipped คือ7 workflowที่เปลี่ยนข้อมูลรันเฉพาะDesktop ไม่รันซ้ำอีก3viewport public interactions และ Owner layoutยังรันครบ4viewport ไม่ใช่ข้ามกรณีที่ล้มเหลว

## Workflow ที่ตรวจได้จริง

- สมัคร/เข้าสู่ระบบ/เซสชันกับ GoTrueจริงที่ auto-confirmเฉพาะ disposable test stack คำนวณราคาและคูปองฝั่ง Server สร้าง orderแบบ transaction ตรวจ wrong amount/forged/duplicate signed Sandbox event และ receipt PDF
- อัปโหลดสลิปสมมติจริง ตรวจสลิปซ้ำและลบ orphan file ลูกค้าเปิด Admin slip endpointไม่ได้ เจ้าของอ่านสลิป privateได้ ตรวจยอดผิดไม่เกิด grant จากนั้นแก้ยอดและยืนยัน Sandboxแล้วดาวน์โหลด ZIPจริงได้ bytes/hashตรง metadata ไม่มี grant หรือ revokeแล้วต้อง403
- อัปโหลดเอกสารสมัครเรียนสมมติผ่าน Server Action เจ้าหน้าที่ตรวจและส่งออก CSV/PDFไทย โรงเรียนอื่น/editorเข้าข้อมูลเด็กไม่ได้ ผลคัดเลือกและหมายเหตุไม่ออก Data APIก่อนประกาศผล และอ่านได้หลังประกาศ
- คิวใบสมัครเกิน100รายการเข้าถึงต่อได้ แม้ timestampsเท่ากัน ใช้ cursor timestamp+UUID ไม่ข้ามรายการ
- ZIP ที่มี .env.local ถูกปฏิเสธ ZIPถูกต้องเก็บจริง แต่ replacementที่ยังไม่ตรวจรับไม่ activate ระบบปฏิเสธ credential paths, traversal, symlink, Windows absolute path และ bounded size/count
- Private buckets: anon/ลูกค้าข้ามสิทธิ์อ่าน เขียน list หรือ signไม่ได้แม้มี legacy permissive policy การใช้ bucketเดิมไม่ถูกเปลี่ยน Signed URLตรวจ signature, bytes และ expiryที่ origin รวม MIME/ขนาด/cache metadata และลบobjectแล้วURLอ่านไม่ได้
- Coupon race, transaction reference deduplication, VIP/admin escalation denial, refund/revoke, rate limits, audit/outbox leases/daily idempotency และ release attestationผ่าน
- Demo Admission/Attendanceใช้ข้อมูลสมมติในbrowser ไม่ส่งข้อมูลเด็กจริง Attendanceแยกรายวัน/รายคาบ/โรงเรียนและCSVตรงบริบท เป็น Demo ไม่ใช่backendผลิตภัณฑ์พร้อมขาย
- PDFผ่าน text extraction และตรวจภาพ renderจริงทั้งไทย อังกฤษ เลขใบสมัคร ปีและยอดเงิน ดู PDF-VALIDATION-20261126.json

## ปัญหาที่พบและแก้

Storage APIใหม่ห้ามลบ metadataด้วยSQL จึงใช้ upload/remove API ไม่ปิด protect_delete และเติม privilegesเฉพาะ test bootstrap จากนั้น full integration/storageผ่าน

ฟอร์ม Reactเดิมล้างค่าหลัง validation error แก้รักษาข้อมูลเมื่อerror/resetเมื่อsuccess และล็อก fieldsetระหว่างpending ทดสอบ error/retry/success จริง ดู FORM-RETENTION-20261126.json

Live public testsรอบแรกผ่าน68/76 อีก8กรณีเชื่อม APIไม่ได้เพราะ APIRequestContextไม่ใช้ network proxyของเครื่อง เพิ่ม PLAYWRIGHT_PROXY_SERVERแบบ opt-in แล้ว PDF/API denialผ่าน2/2 ก่อนรันครบ source3f3dd39ได้88/88 ไม่เปลี่ยน auth หรือ assertionsเพื่อทำให้ผ่าน

## ขอบเขตการ Deploy และสิ่งที่ยังไม่ตรวจรับ

Preview: https://chaylueklab-software-store-azoqphrr9-waramatw2546-4532.vercel.app คง Vercel SSOไว้ ทดสอบผ่าน connectorที่มีบัญชีอนุญาต 42 HTTP checks ผ่าน รวม404สินค้าไม่มีจริง/401ดาวน์โหลดไม่มีสิทธิ์ Runtime error/fatal queryของdeploymentนี้ในช่วง30นาทีตรวจไม่พบรายการที่ตรงเกณฑ์ ดู VERCEL-PREVIEW-20261127.json ผล200ของ protected pagesเป็นหน้าlogin/setupหลังredirect ไม่ใช่หลักฐานเข้าAdmin Hostedสำเร็จ

พบ store.chaylueklab.com ผูกอยู่แล้วและมี Productionจากงานภายนอก ใช้ตรวจอ่าน/ทดสอบ public UIเท่านั้น ไม่เปลี่ยน DNS, main หรือ promote Productionใน sessionนี้ ไม่ถือว่า Previewผ่านconnectorพิสูจน์ GitHub Actions deploy workflowแล้ว

- Hostedยังไม่ตั้ง Supabase: database_configured=false, payment_mode=disabled, ready_for_live_payments=false ไม่ทดสอบ signup-to-downloadบนHostedหรือเก็บข้อมูลเด็กจริง
- Storage CIเป็น origin/file backend ยังไม่ใช่ Supabase Smart CDN ทดสอบ persisted cacheControl=0แล้ว signed responseของlocal APIไม่มี Cache-Control header จึงยังต้องตรวจ Hosted/CDN expiryแยก
- SMTP/recovery delivery, hosted backup/restore/advisors, MFA และ Safari/iPhone/Android/Windowsอุปกรณ์จริงยังรอตรวจรับ การจำลอง viewportไม่แทน physical device test
- Manual PromptPayต้องตั้งผู้รับและตรวจยอดธนาคารจริงก่อน ownerอนุมัติเงินจริง APIตรวจสลิป/ธนาคารเป็นทางเลือกเมื่อมีสิทธิ์ HMAC trusted bridgeไม่ได้ตรวจภาพสลิปเอง
- พร้อมขายจริง0ระบบ สองระบบแรกRC.3 อีก13ระบบยังไม่มีimplementationพร้อมขาย แม้ AttendanceมีDemoแล้ว

## ทำซ้ำ

ดู REAL-STORAGE-TESTS-TH.md สำหรับ full service CI เครื่อง Localนี้พื้นที่ไม่พอ Storage image จึงใช้ TEST_STORAGE_API=falseแบบ schema fixtureและไม่อ้างว่าเป็นStorage APIจริง ผลfull serviceด้านบนมาจากGitHub Actionsที่ดาวน์โหลดหลักฐานและตรวจhashแล้ว
