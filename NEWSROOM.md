# CHAYLUEKLAB NEWSROOM

โมดูลนี้นำเฉพาะ role, status transition, source validation, editorial hand-off และ owner approval จาก `Metmetza88/botpress/newsdesk`/`seed-bots.mjs` มาปรับใช้ ไม่มี WPF/WebView2 หรือ Windows host ถูกย้ายมา

## การทำงาน

`pitched → assigned → drafting → factcheck → editing → ready → owner approval → published`

การเผยแพร่ต้องผ่าน `POST /newsroom` พร้อม `x-line-id-token` ของ owner และค่า `NEWSROOM_OWNER_LINE_ID` ฝั่ง Supabase เท่านั้น หน้าเว็บอ่านเฉพาะ `published + verified + owner_approved_at` และปุ่มแชร์ LINE สร้างลิงก์ share เท่านั้น ไม่โพสต์อัตโนมัติ

ตั้งค่า `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LINE_CHANNEL_ID`, `NEWSROOM_OWNER_LINE_ID` ใน Supabase Edge Function secrets ห้ามใส่ใน GitHub
