# CHAYLUEKLAB SOFTWARE STORE — สถานะจากหลักฐานจริง

วันที่เริ่ม: 2026-11-24 UTC • ผู้พัฒนา WORAMET AI LAB

## จุดเริ่มต้นและการสำรอง
- Repository เดิม: Metmetza88/chaylueklab (ไม่สร้าง Repository ใหม่)
- Branch: feature/woramet-school-store-20261124
- ก่อนแก้: e493777066eee586a0fdeae54b04dda9e1ba64bb
- main ที่ตรวจ: bbed5bd421a2c94b63000f4f64c26c4216af1ebf
- สำรอง Git ทุก ref: /workspace/scratch/store-backups/chaylueklab-before-store.bundle
- ต้นฉบับแตกแยกอ่านอย่างเดียว: /workspace/scratch/woramet-original/woramet-store
- ZIP 1 และ 4: SHA-256 93c126d56b4a94e63f5a58f8ed6523752323b849750bc4dc0a728febacaf4702 (เหมือนกัน)
- แอปร้านค้า: apps/software-store แยกจากเว็บหลัก ไม่มีการแก้ LIFE OS, ร้านเสื้อผ้า หรือ LINE OA

## สิ่งที่ตรวจพบ
- ZIP มี 27 ไฟล์ ไม่มี DEPLOY-TH.md หรือ supabase/catalog-drafts.sql
- schema เดิมมี seed ยอดขายและรีวิวสมมติ ต้องนำออกจากระบบใหม่
- checkout เดิมเขียน orders และ items คนละ transaction
- webhook เดิมเป็น shared-secret header ไม่มี HMAC, event identity หรือ transaction reference
- ไม่มี payment gate, release readiness gate, tests, lockfile, admin products, support และ multi-school application implementation
- SQL ที่แนบเสริมใช้ CREATE TABLE IF NOT EXISTS กับ column names ที่ไม่ตรงฐานเดิม จึงใช้แทน migration upgrade ไม่ได้
- SQL เสริมเปิดให้คนทั่วไปอ่าน application ทั้งหมดที่ is_demo_data=true และแก้ vip_expires_at ได้ จึงไม่ใช้โดยตรง
- รายงานที่แนบกล่าวว่า 2 สินค้าพร้อมขาย แต่ไม่มี source, ZIP, screenshots หรือผลทดสอบรองรับ จึงไม่ถือว่าเป็นผลทดสอบจริง

## การเชื่อมต่อที่ตรวจแล้ว
- GitHub สิทธิ์ push/admin อ่านได้จริง
- Vercel account/team ที่ connector เห็น: team_kA0EAug4JrrTT6ZIc54RXcmL — list_projects คืนรายการว่างทั้ง team และ personal scope
- Supabase ที่เห็น: CHAYLUEKLAB Reminder Backend และ Metmetza88's Project; ระบบเดิมมีข้อมูลใช้งานจริง ต้องไม่ทับตารางเดิม
- ยังไม่เปลี่ยน DNS, ยังไม่เปิดรับเงินจริง, ยังไม่อ้างว่าเชื่อม LINE หรือ Income Assistant สำเร็จ

## กำลังดำเนินการ
ติดตั้ง dependency แบบ pin version, สร้าง schema แบบ namespaced, ร้านค้าและระบบโรงเรียน, tests และคู่มือ

## Release gate
สินค้าทั้ง 15 ระบบเป็น Coming Soon จนมี source, database, manuals, release ZIP และหลักฐานทดสอบครบ ไม่มีสินค้าพร้อมขายที่ยืนยันได้ในขณะเริ่มต้น

## อัปเดตไฟล์ล่าสุดและสิ่งที่ลงมือแล้ว
- ZIP ล่าสุด SHA-256: e42f3204e6d7984fc07f78e95ef1d519a43f2d910f6ef7000f3298d1f5c80b38 มี DEPLOY-TH.md/catalog-drafts.sql แล้ว ใช้ฉบับนี้เป็นฐานและเทียบทุกไฟล์กับฉบับแรก
- เพิ่มร้านค้าและ source MET School Pro/MET Admission พร้อม role, rounds, documents, Thai PDF, CSV และ school variants
- UI Demo ไม่รับข้อมูลเด็กจริง ใช้ค่าตัวอย่างคงที่และ state ใน browser memory
- สำเร็จการทดสอบชุดแรก Unit27 และ DB/Auth/RLS18 กับ PostgreSQL17 + GoTrueจริง + PostgRESTจริง
- Playwright ชุดแรก signup, checkout, signed webhook Sandbox, payment retry, grant visibility, receipt PDF, school application/review/export และ cross-school denial ผ่าน; public sweep3ชุดติด timeoutรวม16หน้า จึงแยกเป็นรายหน้าและทดสอบ Production Build ต่อ
- Local Supabase เต็มชุดและ Storage API pull ไม่สำเร็จ (no space left on device) ใช้ storage schema fixture แทน ห้ามถือว่าผ่าน Storage E2E
- Vercel create_project POST /v11/projects ใน team_kA0EAug4JrrTT6ZIc54RXcmL คืน403 forbidden ไม่มีสิทธิ์สร้าง project; ไม่มี Vercel CLI, VERCEL_TOKEN หรือ CLI auth file ให้ใช้ fallback ไม่มี Project/Preview/Production/DNS ถูกสร้างหรือเปลี่ยน
- รอเจ้าของระบุ staging Supabase และ authorized slip provider ผ่านคำถามที่ส่งแล้ว ไม่รับ secret ผ่านแชต
