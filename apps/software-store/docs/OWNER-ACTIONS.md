# สิ่งที่ต้องให้เจ้าของดำเนินการก่อนเปิดขาย

1. **สิทธิ์ Vercel:** ให้สิทธิ์สร้าง/เชื่อม Project ร้านค้าบน team ที่ถูกต้อง หรือระบุ Project ร้านค้าที่สร้างไว้แล้ว Connector ปัจจุบันคืน403 ไม่มีการสร้าง project สำเร็จ Root ต้องเป็น `apps/software-store` และต้องแยกจากเว็บหลัก
2. **Supabase staging:** ระบุ Project แยกที่อนุญาตให้ทดสอบ บัญชีที่เห็นมี Reminder Backend และ Metmetza88's Project ซึ่งมีระบบเดิม ยังไม่แก้ hosted schema หรือเก็บข้อมูลนักเรียนจริงในงานนี้
3. **Secrets:** ตั้ง Supabase URL/client key/service role, APP_URL, SMTP และ secret webhook ที่จำเป็นใน Vercel/secret settings โดยตรง ไม่ส่งค่าผ่านแชต Source ไม่มี secret จริงรวมอยู่
4. **Payment Sandbox:** ระบุผู้ให้บริการตรวจเงิน/สลิปที่ได้รับอนุญาตและสิทธิ์ Sandbox เพื่อสร้าง adapter และทดสอบกับ transaction จริงของผู้ให้บริการ Trusted bridge ปัจจุบันไม่ใช่ระบบตรวจสลิปจากภาพเอง
5. **Source visibility/license:** Repository เดิมเป็น public การเก็บ ZIP private ไม่ปิดการอ่าน Source ใน GitHub ต้องตัดสินใจรูปแบบการขายและสิทธิ์การเข้าถึง การเปลี่ยน repository visibility ต้องตรวจผลต่อ Pages/ระบบเดิมก่อน ไม่สร้าง repo ใหม่หรือเปลี่ยน visibility เอง
6. **ตรวจรับผลิตภัณฑ์:** ทดสอบ Storage upload/download/expiry, SMTP/recovery, backup/restore, Safari/iPhone/Android จริง และนโยบายเก็บ/ลบข้อมูลโรงเรียนก่อนข้อมูลเด็กจริง จากนั้นบันทึกผลทดสอบ SHA-256 ของ release และกำหนดสินค้าที่พร้อมขาย
7. **เปิดเงินจริงและ DNS:** อนุมัติแยกหลังครบ Sandbox/Preview evidence แล้วเท่านั้น จึงตั้ง live gate ทั้ง env+DB และผูก `store.chaylueklab.com` ตามค่า DNS ของ Project ที่ยืนยัน ห้ามเปลี่ยน `chaylueklab.com`
8. **Automations:** ให้ endpoint/API scope และสิทธิ์ของ Command Center, Income Assistant, LINE OA รวมทั้งแผน scheduler/งบประมาณก่อนทดสอบส่งจริง Queue มีอยู่แล้ว แต่ยังไม่มีข้อความจริงถูกส่ง

ผู้พัฒนาเตรียม source, migrations, scripts, tests, คู่มือ และ ZIP สำหรับตรวจรับแล้ว ไม่ต้องให้เจ้าของเขียนโค้ดส่วนเหล่านี้เอง เมื่อให้ข้อมูล/สิทธิ์ที่ขาดจึงดำเนิน external verification และ deploy ต่อได้

การตั้ง CI/Deploy: ดู [CI-DEPLOY-TH.md](CI-DEPLOY-TH.md) สำหรับ Environments ร้านค้าแยก3รายการ, required owner reviewer, branch policies, Variables และ Secrets ที่ต้องตั้งผ่าน GitHub Settings ปัจจุบันการแก้ Environment/อ่าน Variables คืน403 จึงยังตั้งให้แทนไม่ได้ `STORE_DEPLOY_ENABLED` ยังไม่เปิด และไม่แก้ `Preview`, `Production`, `github-pages` เดิม
