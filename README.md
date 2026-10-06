# CHAYLUEKLAB

เว็บ LINE LIFF สำหรับงาน การเตือน การเงิน และสมาชิก Plus **59 บาท/เดือน**

## ระบบชำระเงิน

- Stripe Checkout รับชำระผ่านบัตรและต่ออายุรายเดือน
- ยืนยันบัญชีจาก LINE token ทางเซิร์ฟเวอร์ ไม่รับ user ID จากหน้าเว็บ
- ต้องยืนยันการต่ออายุก่อนสร้าง Checkout
- ป้องกันสร้างรายการสมัครซ้ำ และใช้หน้าชำระเดิมระหว่างที่ยังไม่หมดอายุ
- เปิดสิทธิ์จาก webhook ที่ตรวจลายเซ็นและตรวจแพ็กเกจ 59 THB เท่านั้น
- จัดการบัตรและยกเลิกต่ออายุผ่าน Stripe Customer Portal
- ไม่เปิดสิทธิ์จาก `payment=success` ใน URL; ช่วงทดลองใช้ฟรีไม่ถือว่าเป็นการชำระสำเร็จ

## สถานะ

โค้ดพร้อมสำหรับติดตั้ง แต่การเปิดรับเงินจริงต้องมีบัญชี Stripe ที่เปิดใช้งานและติดตั้ง functions/secrets ใน Supabase ก่อน ไม่มี key หรือสิทธิ์ติดตั้งรวมอยู่ใน repository นี้

ดูขั้นตอนใน [PAYMENTS.md](PAYMENTS.md)

## ตรวจสอบและเตรียมไฟล์

ใช้ Node.js 24+ และ Deno 2:

```sh
node --test tests/billing.test.mjs
node scripts/prepare-billing.mjs
deno check supabase/functions/billing/index.ts supabase/functions/stripe-webhook/index.ts
```

ไฟล์ต้นฉบับ: `billing.ts`, `billing-core.ts`, `membership.ts`, `index.ts` (Stripe webhook), `index.html` (หน้าเว็บ)

`prepare-billing.mjs` สร้างสำเนาใน `supabase/functions/` สำหรับ deployment; แก้ไฟล์ต้นฉบับแล้วรันคำสั่งนี้ทุกครั้ง
