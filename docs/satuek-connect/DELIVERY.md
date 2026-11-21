# ผลการส่งมอบ Satuek Connect

สถานะ: **เดโมในเครื่องที่ผ่านการทดสอบ ไม่ใช่ Production ของชุมชน**

## ผลทดสอบวันที่ 21 พฤศจิกายน 2569

| รายการ | ผล |
| --- | --- |
| เปิดแอป/ไม่มีหน้าขาว/ครบ 4 เมนู | ผ่าน |
| ค้นหาสินค้า ช่าง บริการ และตำบล | ผ่าน |
| ตัวกรอง 12 ตำบลและหมวดหมู่/ไม่มีผลค้นหา | ผ่าน |
| เปิดฟอร์ม ตรวจข้อมูล ลงและแก้ประกาศ รีเฟรชแล้วยังอยู่ | ผ่าน |
| ลงและแก้บริการทดลอง | ผ่าน |
| รายการโปรด รีวิวทดลอง และรายงานในเครื่อง | ผ่าน |
| แจ้งเรื่อง เปลี่ยน 3 สถานะ กรอง และจำกัดส่งถี่ | ผ่าน |
| `tel:1669`/ไม่แสดงโทรศัพท์ที่ยังไม่ยืนยัน | ผ่านการตรวจลิงก์ ไม่โทรจริง |
| WebKit 375×812 และ 390×844 | ผ่านการจำลอง |
| Chromium Android 412×915 และ Desktop 1440×1000 | ผ่านการจำลอง |
| Horizontal overflow | ไม่พบใน 4 โปรไฟล์ |
| JavaScript/console/asset HTTP errors | ไม่พบในการทดสอบหลัก |
| ข้อมูลเสีย/พื้นที่เต็ม/XSS จากข้อความ | ผ่าน |
| ทางลัด 8 หมวดและ Back ใน browser | ผ่าน |
| ราคาแพ็กเกจครบ/ไม่มีรับเงิน/LIFF ยังไม่กำหนด ID | ผ่าน |
| Playwright รวม | **32 กลุ่มผ่าน** ดู `browser-results.json` |
| Unit/security/artifact tests ของ Repository | **125 ผ่าน / 0 ไม่ผ่าน** ดู `unit-results.txt` |
| Build static artifact | ผ่าน 64 ไฟล์ SQL, tests, docs ไม่ถูกเผยแพร่ |
| เว็บไซต์เดิม | เปรียบเทียบ hash แล้ว 50 ไฟล์เดิมไม่เปลี่ยน ไม่แตะ Production |
| SQL DDL/RLS | ผ่านใน PostgreSQL 17 แยก ดู `database-results.txt` |
| Safari/Android/LINE บนอุปกรณ์จริง | **ยังไม่ได้ทดสอบ** |
| Supabase Auth, API และ RLS บน Cloud | **ยังไม่เชื่อม/ไม่ติดตั้ง** |
| การเผยแพร่จริง/การชำระเงินจริง | **ยังไม่เปิด** |

SQL ทดสอบสิทธิ์อ่านข้อมูลส่วนตัว, การแก้/ลบ/ย้ายเจ้าของประกาศผู้อื่น, ปลอม shop owner, ยืนยันบัญชีหรือเผยแพร่เอง, ปลอมสิทธิ์ผ่าน user_metadata, รีวิวตนเอง, รีวิวที่ไม่ผ่านตรวจสอบ, validation ตำบล, โพสต์ถี่, ถอนการเผยแพร่หลังแก้ไข, trusted moderator และ RLS ทั้ง 7 ตาราง Auth helpers ในการทดสอบเป็นตัวจำลอง ไม่ใช่การยืนยันว่า Supabase Auth จริงตั้งค่าครบแล้ว

## ภาพหน้าจอ

- iPhone 390px: [หน้าหลัก](screenshots/iphone-390-home.png), [ตลาด](screenshots/iphone-390-market.png), [ช่างและบริการ](screenshots/iphone-390-services.png), [ช่วยเหลือ](screenshots/iphone-390-help.png)
- Desktop 1440px: [หน้าหลัก](screenshots/desktop-1440-home.png), [ตลาด](screenshots/desktop-1440-market.png), [ช่างและบริการ](screenshots/desktop-1440-services.png), [ช่วยเหลือ](screenshots/desktop-1440-help.png)

## สิ่งที่เจ้าของต้องเชื่อมต่อ/ยืนยันก่อนเปิดจริง

1. สิทธิ์ Vercel ของโปรเจกต์เดิม หรือการอนุมัติแยกโปรเจกต์หากจำเป็น ไม่แก้/ทับ Production เดิม
2. เลือกและตั้ง Supabase Auth/LINE token verification ฝั่งเซิร์ฟเวอร์, deploy schema แยกใน staging, เชื่อม frontend, ตรวจ storage policies และสำรองข้อมูล
3. แต่งตั้งผู้ดูแล สร้างกระบวนการยืนยันผู้ขาย/ช่าง/ช่องทางติดต่อ/รีวิวจริง พร้อม audit log และจัดการรายงานจริง
4. LIFF ID/HTTPS Endpoint สำหรับ Satuek Connect ไม่ส่ง Channel Secret ผ่านหน้าเว็บหรือแชต
5. หมายเลขหน่วยงานสตึกจากแหล่งทางการและผู้ประสานงานรับเรื่อง ไม่มีระบบรับแจ้งฉุกเฉินจริงในเดโม
6. ยินยอมใช้ข้อมูลร้านค้า/รูป/ข้อมูลติดต่อ และนโยบายเก็บ/ลบข้อมูล
7. ทดสอบ Safari, Android และ LINE บนเครื่องจริง แล้วทดสอบระบบหลายบัญชีและ moderation ก่อนเปิดให้ประชาชนใช้
8. ระบบชำระเงินที่ตรวจ webhook/ยอด/แพ็กเกจ/รายการซ้ำ/อายุสิทธิ์/คืนเงินอย่างปลอดภัย ก่อนเปิดรับเงิน

คู่มือใช้งานบน iPhone ขั้นตอนพัฒนา และแผนเปิดรับร้านค้า/รายได้ 30 วันอยู่ใน [README.md](README.md)

## GitHub และสถานะ Preview

- Branch: https://github.com/Metmetza88/chaylueklab/tree/feature/satuek-connect
- Pull Request: https://github.com/Metmetza88/chaylueklab/pull/53
- Commit ตัวแอปล่าสุดที่ผ่าน Playwright 32 กลุ่ม/Unit 125 รายการ: `280bc66` (แก้การเลือกหน้าจอและความเข้ากันได้กับเบราว์เซอร์)
- Commit แรก: `903330b313cb53b71f28612caa011a8dba33f09c`
- Source/unit checks และ Control Center CI ของ commit แรกผ่าน
- CodeQL รอบแรกพบ `js/unvalidated-dynamic-method-call` ในการเลือกหน้าจอจาก URL แก้เป็น switch ที่เรียกฟังก์ชันที่ระบุไว้โดยตรง พร้อมทดสอบ URL ที่ไม่รู้จัก ผล CodeQL ของ commit ล่าสุดให้ดูที่แท็บ Checks ของ PR ก่อนพิจารณา merge
- Vercel: ไม่พบ deployment ของ branch นี้ใน GitHub และ connection ปัจจุบัน list projects ว่าง / อ่านโปรเจกต์เดิมได้ 404 ยังไม่มี HTTPS Preview ของงานนี้ที่ยืนยันได้
- ไม่ merge PR ไม่ deploy Production ไม่สร้างโปรเจกต์ใหม่ ต้องให้เจ้าของเชื่อมต่อสิทธิ์โปรเจกต์เดิม หรืออนุมัติโปรเจกต์ Vercel ใหม่แยกก่อนดำเนินการต่อ
