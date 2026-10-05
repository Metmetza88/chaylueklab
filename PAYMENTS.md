# เปิดรับชำระสมาชิก Plus 59 บาท/เดือน

## สิ่งที่ต้องมี

- บัญชี Stripe ของเจ้าของบริการ เปิดรับชำระเงินจริงและตั้งค่าบัญชีรับเงินเรียบร้อย
- สิทธิ์จัดการ Supabase project `bxaplhrunxiadjsdobyl`
- URL หน้าเว็บจริงที่แสดงหน้า `view=membership` และ LINE Login/LIFF ใช้งานได้

อย่าส่ง secret key ลงแชตหรือ commit ลง GitHub ตั้งค่าใน Supabase Dashboard → Edge Functions → Secrets

## 1. ฐานข้อมูล

สำหรับระบบเดิมที่มีตาราง LINE อยู่แล้ว ตรวจว่าติดตั้ง `setup-membership.sql`, `setup-owner.sql`, `setup-trial.sql`, `setup-plan59.sql` แล้วตามลำดับ ตาราง `line_files`, `line_notes`, `line_issues`, `line_tasks`, `line_reminders`, `line_finances` ต้องมีอยู่ก่อน

สคริปต์ SQL เดิมบางไฟล์ไม่รองรับรันซ้ำ: ตรวจ schema และใช้เฉพาะส่วนที่ยังขาด อย่ารันทั้งชุดทับฐานข้อมูลที่ติดตั้งแล้ว ต้องมี `billing_customers`, `billing_subscriptions`, `billing_events`, `app_owner`, `member_access_overrides`, `membership_trials`, `member_monthly_usage` และ RPC `billing_reserve_checkout`, `billing_apply_event`, `membership_start_trial`

## 2. ตั้งค่า Stripe แบบทดสอบก่อน

1. เปิด Customer Portal ใน Stripe Dashboard เปิดการเปลี่ยนบัตรและยกเลิกต่ออายุ ไม่เปิดการเปลี่ยนแพ็กเกจเป็นราคาอื่น
2. เพิ่ม webhook endpoint:
   `https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1/stripe-webhook`
3. เลือก event: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. ตั้ง Supabase secrets: `STRIPE_SECRET_KEY` ของโหมดทดสอบ, `STRIPE_WEBHOOK_SECRET` จาก endpoint เดียวกัน, `BILLING_RETURN_URL` เป็น URL เว็บที่ใช้จริง, `LINE_LOGIN_CHANNEL_ID=2011681452`
5. Supabase มี `SUPABASE_URL` และ service-role key ให้ functions โดยอัตโนมัติ ไม่เพิ่ม key ลงหน้าเว็บ

Checkout สร้างราคา 59 บาท/เดือนฝั่งเซิร์ฟเวอร์ ไม่ต้องสร้าง Price ID เอง ไม่มี trial ของ Stripe เพิ่มอีกครั้ง ผู้ใช้จะเริ่มชำระทันทีเมื่อยืนยันอัปเกรด

## 3. ติดตั้ง

```sh
node scripts/prepare-billing.mjs
supabase login
supabase link --project-ref bxaplhrunxiadjsdobyl
supabase functions deploy billing --project-ref bxaplhrunxiadjsdobyl
supabase functions deploy stripe-webhook --project-ref bxaplhrunxiadjsdobyl
```

`supabase/config.toml` ปิด Supabase JWT verification เฉพาะสอง functions นี้ เพราะ billing ตรวจ LINE token และ webhook ตรวจ Stripe signature เอง ไม่ปิดการยืนยันบัญชีในโค้ด

เผยแพร่ `index.html` ที่แก้แล้วด้วยระบบ hosting เดิม (ยังไม่ทราบการตั้งค่า hosting ของโดเมนนี้) การเปลี่ยน repository เพียงอย่างเดียวไม่ยืนยันว่าเว็บไซต์เผยแพร่แล้ว

## 4. ตรวจแบบทดสอบ

- เข้าสู่ระบบด้วย LINE ของผู้ใช้ที่ไม่ใช่เจ้าของและไม่ถูกระงับ
- เปิดหน้าสมาชิก ตรวจข้อความโหมดทดสอบและราคา 59 บาท
- ไม่ติ๊กยืนยันต่ออายุ: ต้องไม่สร้างหน้าชำระ
- ยืนยันและชำระด้วยบัตรทดสอบ Stripe `4242 4242 4242 4242` วันหมดอายุอนาคต CVC ใดก็ได้
- ตรวจ webhook HTTP 200, subscription `active`, `paid=true`, ระยะเวลายังไม่หมด; กดตรวจสอบสถานะในเว็บแล้วต้องเป็น Plus
- กดยกเลิกหน้า Checkout: ไม่มีการเปิดสิทธิ์จาก URL
- เปิดสองแท็บสมัครพร้อมกัน: ไม่เกิดรายการเก็บเงินซ้ำ
- เปิด Portal เปลี่ยนบัตร/ยกเลิกต่ออายุ และตรวจสถานะหลัง webhook
- ส่ง webhook signature ผิด: ต้องตอบ 400 และไม่เปลี่ยนสิทธิ์
- การทดสอบใน repository จำลอง Stripe/ฐานข้อมูล; ต้องตรวจครบเส้นทางจริงนี้ก่อนเปิด live

## 5. เปิดเงินจริง

เปลี่ยนเป็น `sk_live_...` และ webhook signing secret ของ live endpoint ที่ตรงกัน เปิด Customer Portal ใน live mode ด้วย ไม่มีคำสั่งใน repository นี้ทำการเปลี่ยนโหมดให้อัตโนมัติ

ตรวจว่าหน้าสมาชิกไม่แสดงโหมดทดสอบและ Checkout แสดง 59 THB/เดือน เจ้าของบริการควรตรวจรายการชำระและ webhook ครั้งแรกจาก Stripe Dashboard ก่อนประกาศเปิดบริการ

อ้างอิง: [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [Stripe webhooks](https://docs.stripe.com/webhooks), [Supabase function authentication](https://supabase.com/docs/guides/functions/auth)
