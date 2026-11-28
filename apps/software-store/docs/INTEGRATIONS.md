# การเชื่อมต่อและระบบอัตโนมัติ

## สิ่งที่โค้ดทำแล้ว

เมื่อสร้าง order และยืนยันเงิน RPC บันทึก outbox ภายใน transaction เดียวกัน สิทธิ์ดาวน์โหลดอยู่ใน DB ไม่ขึ้นกับ LINE หรืออีเมล การตอบ support และอัปโหลด release มี event เข้าคิว ส่วน `revenue.daily` สรุปคำสั่งซื้อ live ที่ชำระแล้วของวันก่อนตามเวลาไทย

`GET/POST /api/automations/dispatch` ต้องใช้ `Authorization: Bearer <CRON_SECRET>` ที่ยาวอย่างน้อย 32 ตัว ข้อความไม่มี PII ของผู้ซื้อ/นักเรียน ส่งเฉพาะ event identity และรหัสธุรกรรมภายใน ปลายทางต้อง query รายละเอียดผ่านช่องทางที่ได้รับอนุญาตเอง

Queue claim ใช้ FOR UPDATE SKIP LOCKED และ lease สองนาที ส่งครั้งละไม่เกินห้า event, HMAC, retry/backoff และบันทึก delivered_at เมื่อได้ HTTP 2xx ผู้รับต้อง deduplicate `x-event-id` เพราะระบบ retry แบบ at-least-once ไม่มีการอ้างว่าส่งสำเร็จเมื่อปลายทางไม่ได้ตอบรับ

ยังไม่ตั้ง Cron อัตโนมัติบน Vercel เพราะต้องยืนยัน plan, endpoint และสิทธิ์ก่อน ตัวอย่าง schedule หลังอนุมัติแผนที่รองรับคือเรียก route นี้ทุก 5 นาที และต้องทำให้ `CRON_SECRET` ตรงกัน

## Trusted payment bridge

เปิดเฉพาะ staging/Sandbox หลังตั้งค่าครบ ใช้ protocol ต่อไปนี้จาก adapter ของผู้ให้บริการที่ได้รับอนุญาตตรวจ transaction จริงแล้ว:

- Headers `x-payment-timestamp`: Unix seconds, `x-payment-signature`: `sha256=<hex>`
- Signature: HMAC-SHA256(secret, timestamp + '.' + raw request body)
- รับ timestamp ในช่วง +/- 300 วินาทีเท่านั้น ขนาด body ไม่เกิน 16 KB
- Body strict fields: `event_id`, `transaction_ref`, `order_id`, `amount_cents` (integer), `currency='THB'`, `mode='sandbox'|'live'`, `recipient_id`, `status='succeeded'`
- ต้องตรง recipient ที่ตั้งใน secret config, mode ตรง env และ DB, ยอดตรง order, reference ไม่เคยใช้ และ event retry body ตรงเดิม

นี่ไม่ใช่การยืนยันสลิปจากภาพโดยอัตโนมัติ โค้ดไม่ได้เชื่อมผู้ให้บริการตรวจสลิปใดโดยไม่มีบัญชี/API ที่ได้รับอนุญาต SHA ของภาพช่วยบล็อกไฟล์ซ้ำ แต่การดัดแปลงภาพต้องป้องกันด้วย transaction reference และการตรวจธนาคารจริง

## ที่ตรวจได้ / สิ่งที่ขาด

| ระบบ | หลักฐานที่มี | สิ่งที่ต้องเพิ่ม |
|---|---|---|
| GitHub | อ่าน repo/branch เดิมได้ สิทธิ์ push/admin | ผล push/PR ใน PROJECT-STATUS |
| Supabase | เห็นสอง project และตารางระบบเดิม | เลือก staging เป้าหมาย, backup, secrets สำหรับ deployment, Auth SMTP, Storage E2E |
| Vercel | เห็น team แต่ list_projects เริ่มต้นคืนว่าง | ตรวจสิทธิ์ create/deploy และ Project ร้านค้าใหม่แยก |
| Command Center | เตรียม signed outbox protocol | endpoint, secret, acceptance test |
| Income Assistant | เตรียม order/payment/revenue events | API scope และ mapping รายได้จริง |
| LINE OA | ใช้ลิงก์ติดต่อจาก repository เดิมได้ | channel credentials, ผู้รับที่ยินยอม, message template และทดสอบส่งจริง |
| Slip provider | ยังไม่มี authorized account/API | provider-specific adapter และ Sandbox evidence |

ไม่ใส่ Token ใน README หรือ Git ไม่ขอให้ส่ง secret ผ่านแชต ให้เจ้าของบันทึกใน Vercel/Supabase secret settings โดยตรง
