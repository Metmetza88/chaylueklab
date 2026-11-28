# CHAYLUEKLAB SOFTWARE STORE — WORAMET AI LAB

Next.js + TypeScript + Supabase. แอปแยกใน `apps/software-store` ของ Repository เดิม ไม่เปลี่ยนเว็บไซต์หลัก

พัฒนาจาก `woramet-store-reviewed.zip` ฉบับล่าสุด SHA-256 `e42f3204e6d7984fc07f78e95ef1d519a43f2d910f6ef7000f3298d1f5c80b38`

ร้านค้าและ Source ระบบ MET School Pro / MET Admission เป็น release candidate ไม่ใช่สินค้าที่ผ่านการตรวจรับพร้อมขาย สินค้า 15 รายการใน catalog เป็น Coming Soon โดยเริ่มต้นเสมอ ไม่มี seed ยอดขายหรือรีวิว

```sh
npm ci --ignore-scripts
cp .env.example .env.local
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

หากยังไม่ตั้ง Supabase หน้าร้านจะแสดงแคตตาล็อกแผนพัฒนาอย่างชัดเจน ส่วน Auth และคำสั่งซื้อปิดไว้ ไม่มีการปลอมผลสำเร็จ

- [ติดตั้งและ deploy](DEPLOY-TH.md)
- [คู่มือโรงเรียน](docs/SCHOOL-USER-GUIDE-TH.md)
- [คู่มือ iPhone](docs/IPHONE-ADMIN-TH.md)
- [ความปลอดภัย](docs/SECURITY.md)
- [ค่าใช้จ่าย](docs/MONTHLY-COSTS.md)
- [ผลทดสอบ](docs/TEST-REPORT.md)
- [ระบบอัตโนมัติ](docs/INTEGRATIONS.md)
- [สถานะโครงการหลัก](../../PROJECT-STATUS.md)

`APP_VARIANT=school` และ `SCHOOL_SLUG` ใช้ติดตั้งผลิตภัณฑ์เป็นเว็บไซต์โรงเรียนแยกจากร้านค้า ดูคู่มือติดตั้งเพื่อสร้างเจ้าของและพื้นที่โรงเรียน ห้ามใช้ข้อมูลเด็กจริงใน Demo

`npm run package:school` สร้าง ZIP สองระบบพร้อม source, schema, tests, คู่มือ, license และ manifest ที่ระบุว่า **ยังไม่พร้อมขาย** ใน `dist/` จนตรวจรับครบ
