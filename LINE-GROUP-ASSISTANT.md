# ชายลึกลับ — ผู้ช่วย AI ในกลุ่ม LINE (ฉบับเตรียมตรวจ)

## สถานะ
ฟีเจอร์นี้อยู่บนสาขาแยก feat/line-group-assistant-20261012 ยังไม่ได้ merge, apply SQL, ตั้ง webhook หรือเปิดใช้กับกลุ่มจริง บอทตอบเฉพาะ group ไม่แตะระบบแชตส่วนตัวและระบบร้านค้าเดิม

## แยก LINE OA ระหว่างชายลึกลับและ พ.สมนึก (ข้อกำหนดเจ้าของ)
- **ชายลึกลับ (CHAYLUEKLAB)**: LINE OA ของแบรนด์เอง สำหรับร้านค้า, LIFF และผู้ช่วยในกลุ่ม LINE (โปรเจกต์ GitHub Metmetza88/chaylueklab)
- **พ.สมนึก 2&3**: LINE OA คนละบัญชีและคนละ Messaging API channel, webhook และ secrets กับชายลึกลับ; ระบบตอบเฉพาะแชตส่วนตัวที่ source.type=user และ **ห้ามตอบ Group/Room** ตามข้อกำหนดของโปรเจกต์นั้น; ห้ามแก้ project พ.สมนึกผ่าน PR นี้
- **ห้ามนำ Channel Secret, Channel Access Token, LINE OA, webhook URL หรือฐานข้อมูลข้อความของสองระบบมาใช้แทนกัน** แม้เจ้าของจะเป็นคนเดียวกัน
- อนาคตเชื่อมสองระบบผ่าน API กลางที่ตรวจสิทธิ์และระบุแบรนด์/tenant ชัดเจนได้ เฉพาะข้อมูลที่เจ้าของเลือกอนุญาต ไม่ใช่การนำข้อความสนทนาหรือรายชื่อลูกค้าของอีก OA มารวมโดยอัตโนมัติ
- รุ่นนี้ยัง **ไม่มีการเชื่อมข้อมูลข้าม OA** และไม่ได้เพิ่ม Webhook/LIFF ให้ พ.สมนึก

## คำสั่งในกลุ่ม (เวลาไทย Asia/Bangkok)
1. เจ้าของระบบพิมพ์ “ผู้ช่วย เปิด” เพื่อเปิดในแต่ละกลุ่ม จากนั้นบอทแจ้งสมาชิกว่ารับข้อความใหม่เพื่อช่วยสรุปงาน
2. “ผู้ช่วย ช่วย” แสดงคำสั่ง
3. “ผู้ช่วย เพิ่มงาน ตรวจสต็อก กำหนด พรุ่งนี้ 09:00” ตั้งงาน/เตือนครั้งเดียว หรือ “ผู้ช่วย เพิ่มงาน โทรหาลูกค้า” สำหรับงานไม่กำหนดเวลา
4. “ผู้ช่วย งาน” ดูงานค้างและรหัสงาน 8 ตัว, “ผู้ช่วย เสร็จ abcdef01” ปิดงาน
5. “ผู้ช่วย จด ประชุมตกลงวันอาทิตย์” แล้ว “ผู้ช่วย โน้ต”
6. “ผู้ช่วย สรุป” สรุปประวัติใหม่ล่าสุดเมื่อเปิดใช้ AI หรือ “ผู้ช่วย ถาม วันนี้คุยเรื่องส่งของไว้อย่างไร”
7. “ผู้ช่วย เปิดแอป” ส่งลิงก์ LIFF ตามค่าที่ตั้งไว้ (LIFF ยังไม่ถูกเพิ่ม UI ใหม่)
8. “ผู้ช่วย ล้างประวัติ” เฉพาะเจ้าของเพื่อลบข้อความของบอทในกลุ่ม (งานยังอยู่)
9. “ผู้ช่วย ปิด” เฉพาะเจ้าของ หยุดรับ/เก็บข้อความใหม่ในกลุ่มนั้น

## ขอบเขต
- อ่านเฉพาะ source.type=group ที่ LINE ส่งผ่าน webhook พร้อมลายเซ็น HMAC SHA-256 ถูกต้อง; group อื่นที่ยังไม่เปิดจะไม่เก็บข้อมูล
- ไม่ตอบ private, room, media หรือบทสนทนาปกติที่ไม่เรียก “ผู้ช่วย”
- หลังเปิด บันทึกข้อความใหม่รวมถึงข้อความธรรมดาเพื่อใช้สรุป โดยตอบเฉพาะเมื่อถูกเรียกใช้; ต้องแจ้งสมาชิกทุกคนก่อนเปิด
- ล้างข้อความอายุเกิน 30 วันผ่าน scheduled dispatcher; ต้องตั้ง schedule ให้ทำงานจริง ไม่ใช่อายุข้อมูลแบบบังคับถ้า scheduler หยุด
- งานค้างยังอยู่จนถูกปิด ไม่มีการลบงานตาม 30 วัน
- ไม่อ่านประวัติก่อนบอทเข้ากลุ่ม/ก่อนเปิดใช้งาน
- เมื่อมี OPENAI_API_KEY โมเดล AI ภายนอกจะได้รับข้อความกลุ่มล่าสุดเมื่อสมาชิกสั่งสรุป/ถามเท่านั้น ต้องยืนยันนโยบายข้อมูลก่อนเปิด AI
- แจ้งเตือนงานใช้ LINE push และ scheduler ต้องเปิดใช้งาน; ไม่มีการเตือนจนกว่าจะตั้ง schedule + access token
- เวลา วันนี้/พรุ่งนี้ และวันที่ YYYY-MM-DD HH:mm จะตีความเป็นเวลาประเทศไทย

## ห้ามข้ามขั้นตอนก่อนใช้จริง
1. ใช้ Messaging API channel ของ **LINE OA ชายลึกลับเท่านั้น** ไม่ใช้ของ พ.สมนึก; LINE กำหนด Webhook URL ได้หนึ่งรายการต่อ channel ถ้า OA ชายลึกลับมี webhook เดิมที่ใช้งานอยู่ ต้องรักษาฟังก์ชันเดิมและวาง routing/forwarding อย่างปลอดภัยก่อนเปลี่ยน URL
2. ตรวจ owner identity, ความยินยอมสมาชิกกลุ่ม, แผนการเก็บ/ลบข้อความ, ค่า LINE push และการตั้งค่า Allow bot to join group chats
3. สำรอง Supabase แล้ว apply supabase/migrations/20261012042100_line_group_assistant.sql ใน project ที่ยืนยันแล้วเท่านั้น
4. ตั้ง secret ใน Supabase Edge Functions (ห้ามคัดลอกลง GitHub):
   - CHAYLUEKLAB_GROUP_CHANNEL_SECRET — Messaging API channel secret
   - CHAYLUEKLAB_GROUP_CHANNEL_ACCESS_TOKEN — Messaging API channel access token
   - CHAYLUEKLAB_GROUP_OWNER_IDS — LINE User ID เจ้าของที่อนุญาตให้เปิด/ปิดบอทนี้ (บังคับตั้ง; ไม่ใช้ fallback ไปยังสิทธิ์ OA อื่น)
   - CHAYLUEKLAB_GROUP_CRON_SECRET — สุ่มค่า secret ใหม่ยาวและไม่ซ้ำ
   - CHAYLUEKLAB_GROUP_LIFF_URL — ลิงก์ LIFF ที่ตรวจแล้ว (ไม่จำเป็น)
   - CHAYLUEKLAB_GROUP_AI_API_KEY — ใช้สำหรับสรุปและตอบถามของชายลึกลับเท่านั้น (ไม่จำเป็น)
5. Deploy function line-group-assistant หลังผ่าน tests และได้รับอนุมัติ แล้วตั้ง Webhook URL ของ channel ที่เลือกเป็น https://<project-ref>.supabase.co/functions/v1/line-group-assistant
6. ตั้ง scheduled POST เช่น ทุกหนึ่งนาที ไป https://<project-ref>.supabase.co/functions/v1/line-group-assistant/dispatch พร้อม Authorization: Bearer <CHAYLUEKLAB_GROUP_CRON_SECRET> และตรวจ retry/failed pushes
7. ทดสอบในกลุ่มจริงเฉพาะหลังได้รับอนุญาต แล้วตรวจ LINE webhook Verify/Logs และการแจ้งเตือนก่อน production

## ตรวจโค้ดโดยไม่แตะ production
- Node 24+: node --test tests/line-group-assistant.test.mjs
- Deno 2: deno check supabase/functions/line-group-assistant/index.ts

ไม่มีการแก้ LINE OA เดิม, webhook เดิม, workflow deploy, ตารางร้านค้า หรือข้อมูลลูกค้าใน PR นี้ รวมทั้งไม่มีการเปลี่ยนแปลง LINE OA พ.สมนึก

## ความเสี่ยงที่ยังต้องตรวจ
- ระบบกัน LINE event ซ้ำด้วย message ID และกันบันทึกงานซ้ำด้วย source_message_id; หาก LINE API/DB ล้มเหลวระหว่างทำงานต้องตรวจ Logs
- แจ้งเตือนเป็น at-least-once; อาจซ้ำหาก push สำเร็จแต่ DB อัปเดตไม่ได้
- รุ่นนี้ยังไม่มี UI จัดการสิทธิ์สมาชิกหลายบทบาท ไม่มีประวัติย้อนหลังก่อนเปิดบอท ไม่มีการสรุปภาพ/ไฟล์ ไม่มี calendar sync หรือ group recurring reminders
