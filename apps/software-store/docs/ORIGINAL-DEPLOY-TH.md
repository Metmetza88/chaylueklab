# สถานะก่อนเปิดขาย
- ใช้ Supabase ใหม่หรือ schema แยกที่ตรวจแล้วเท่านั้น ห้ามรัน schema.sql ทับฐานเดิม
- ตั้งค่า env จาก .env.example โดยไม่เผยแพร่ secret
- รัน schema.sql และ catalog-drafts.sql ในฐานทดสอบ
- สินค้า 15 รายการเป็น draft ต้องมีไฟล์จริง ตรวจสิทธิ์และทดสอบก่อน publish
- SALES_ENABLED=false และ PAYMENT_WEBHOOK_ENABLED=false เป็นค่าเริ่มต้น
- ก่อนเปิดขาย ต้องทดสอบ RLS ด้วยสองบัญชี, การสร้าง paid โดยตรงต้องล้มเหลว, ราคาและ VIP, ดาวน์โหลดข้ามบัญชีต้องล้มเหลว, ตรวจ QR และยอดเงินจริง, ตรวจ webhook ป้องกันใช้ธุรกรรมซ้ำ
- npm install, npm audit, npm run build ยังไม่ได้ผ่านในสภาพแวดล้อมนี้
- ตั้ง Vercel root directory ให้ตรงกับโปรเจกต์ Next.js แยกจาก LIFE OS; ไม่เปลี่ยนโดเมนหลักจนตรวจ preview
- ยังไม่พร้อม production: ต้องตรวจระบบชำระเงินและทดสอบฐานจริง
