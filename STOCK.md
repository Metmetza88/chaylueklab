# CHAYLUEKLAB CONTROL CENTER

ระบบหลังร้านใน repository `Metmetza88/chaylueklab` เดิม ใช้ LINE Login เดิมและ stock กลางชุดเดียวทุกช่องทาง ไม่สร้าง LIFF หรือระบบสมาชิกอีกชุด ไม่เปลี่ยนโดเมนและไม่แก้ prototype ที่ `work/demos/control-room.html` ซึ่งเก็บข้อมูลเฉพาะเครื่อง

## สถานะที่ตรวจแล้ว

- Supabase เดิมที่เชื่อมต่อ `yobymeygbfiwlngmwjcn`: migration `stock_backoffice` และ `stock_foreign_key_indexes` ติดตั้งแล้ว; Edge Function `stock` ACTIVE version 2
- API: `https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1/stock`
- Live smoke: GET 405, OPTIONS 204, POST ไม่มี LINE credentials หรือใช้ token ทดสอบที่ไม่ถูกต้อง 401
- ตารางทั้งหกเปิด RLS; browser ไม่มี SELECT/WRITE/RPC EXECUTE; service role อ่านได้และเรียก atomic RPC ได้ แต่เขียนตารางตรงไม่ได้
- Realtime publication มีเฉพาะ `stock_variants` สำหรับโมดูลนี้ ตารางว่างจริง ไม่มีสินค้า/ยอด/พนักงานตัวอย่างถูกติดตั้ง
- งานอยู่ใน branch `fix/control-center-plus59` สำหรับตรวจ Draft PR ใน repository เดิม เจ้าของบันทึกข้อยกเว้น review branch ใน ruleset **M** แล้ว แต่ต้องคืนข้อกำหนดการสร้าง/อัปเดต/ลบและ code coverage ที่หายไประหว่างบันทึกตาม `CONTROL-CENTER.md` ก่อน Merge การเชื่อมต่อนี้ไม่มีสิทธิ์ administration และไม่ได้แก้ ruleset เอง

หน้าเว็บรอเจ้าของตรวจ PR และเผยแพร่ เส้นทางหลัง deploy คือ `./control.html` และ `./stock.html` บนเว็บเดิม ใช้ HTML/JavaScript/API ชุดเดียวกัน ไม่ใช่สต๊อกคนละชุด ทางเข้า LINE คือ `https://liff.line.me/2011681452-yexLrODy/control.html` ผ่าน LIFF ที่ผู้ใช้ส่งมา ไม่มี real-owner LINE session หรือรายการขาย production ถูกใช้ในการทดสอบ ดูการรวม patch ใน `CONTROL-CENTER.md`

## ใช้งานร้านครั้งแรก

1. เจ้าของเดิมเข้า LIFF ด้วยบัญชี LINE ที่ตั้งเป็นเจ้าของอยู่แล้ว ระบบเปิดร้านหลักเปล่าให้บัญชีที่ server ตรวจยืนยันเท่านั้น
2. เข้า **สต๊อก → เพิ่มสินค้า / ไซซ์** ใส่ชื่อ สี ไซซ์ SKU ของ variant และจำนวนที่มีจริง ไม่เดาราคาหรือย้ายสินค้า prototype โดยอัตโนมัติ
3. พนักงานใช้ LIFF เดิมแล้วกด **ขอสิทธิ์ใช้งานร้าน** เจ้าของกด **ทีมงาน** เพื่ออนุญาต พนักงานที่ยังไม่อนุญาตไม่เห็น inventory หรือประวัติ
4. ขาย: **ขายสินค้า → หน้าร้าน → ปุ่มไซซ์ → ยืนยัน** จำนวนเริ่มต้น 1 รวมสี่แตะจาก Home; ขายออนไลน์เพิ่มช่องทางและข้อมูลออเดอร์/ลูกค้า/หมายเหตุได้โดยไม่บังคับ

ทุกช่องทางใช้ `stock_variants.stock_quantity` เดียวกัน รายงานนับจำนวนชิ้นตามวันประเทศไทย ไม่มีการสมมติราคาสินค้า ประวัติแสดง 500 รายการล่าสุดต่อช่วง/ช่องทางและระบุเมื่อมีรายการมากกว่านั้น

## ระบบและการ reuse

ใช้ `adminDb()` และ `isOwner()` จาก shared backend เดิม ใช้ config LINE/Supabase ของ Newsroom ที่ตรวจจริงและ Login channel 2011681452 จาก LIFF ที่เชื่อถือได้ ชื่อ/LINE user ID มาจาก LINE Profile ที่ server ยืนยันด้วย ID token และ access token ของคนเดียวกัน ผู้ส่ง JSON ปลอม actor/name/role ไม่ได้

`stock_shop_members` เป็นสิทธิ์พนักงานในร้านที่ผูก LINE ID เดิม ไม่ใช่บัญชี login/subscription อีกชุด ไม่แก้ตาราง membership, trial, billing หรือ Life OS การขาย/รับเข้าอนุญาต STAFF; catalog, ปรับยอดนับจริง และอนุมัติทีมใช้ OWNER

ตรวจ backend `retail-control` เพิ่มจาก project แล้ว: `retail_products`, `retail_transactions`, `retail_staff` ทั้งหมดว่างขณะตรวจ ไม่มี frontend ของ backend นี้ใน release ที่ checkout ไม่ลบหรือ overwrite ของเดิมและไม่สร้างข้อมูลเชื่อมโยงปลอม หน้า Control Center นี้ใช้ API `stock` และ dataset เดียวตาม schema ที่ผู้ใช้ระบุ หากมีข้อมูล retail ถูกเพิ่มจาก release อื่นก่อน merge ต้องตรวจและรวมข้อมูลอย่างชัดเจนก่อนเปิดใช้ ห้ามต่อสอง dataset เป็น stock คนละช่องทาง

## ความปลอดภัยของรายการ

`stock_action` เป็น service-only SECURITY DEFINER ที่ตรวจ invoker และ shop permission ใน database; member share lock ปิดช่องว่างการถอนสิทธิ์; variant row lock ป้องกัน stock ติดลบ; idempotency lock+payload hash ผูก shop/user/request ID; ledger, stock และ receipt บันทึกใน transaction เดียว ADJUST ต้องตรง revision ล่าสุด

Browser เก็บเฉพาะรหัสคำขอและข้อมูลรายการที่ยังยืนยันผลไม่ได้ใน sessionStorage แยกร้าน/ผู้ใช้ ไม่เก็บ LINE token หรือ server secret หากเก็บรหัสไม่ได้จะไม่ส่ง write การกดซ้ำ/refresh/เน็ตหลุดใช้ UUID เดิม ตรวจ `request_status` ก่อนทำรายการใหม่ ไม่เปลี่ยน stock ด้วยการคำนวณใน frontend

Server Realtime bridge ส่งเฉพาะ invalidation ไม่มีสินค้า/ลูกค้า/LINE ID ตรวจสิทธิ์ทุก 15 วินาทีและปิดภายใน 90 วินาที Browser โหลด snapshot ล่าสุด ไม่ล้าง form ที่กำลังกรอก มี polling สำรอง และหยุดเมื่อซ่อนหน้า

## Environment

Stock ไม่ต้องเพิ่ม API key ใหม่ ใช้ `SUPABASE_URL` และ admin credential ที่ Supabase runtime มีอยู่แล้ว รวมถึงเจ้าของเดิมจาก `NEWSROOM_OWNER_LINE_ID` / `LINE_OWNER_USER_ID` หรือ `app_owner` ค่าทั้งหมดอยู่ server เท่านั้น ไม่ใส่ใน HTML/GitHub

Public config อยู่ `data/stock-config.js` และรับ LIFF/project จาก `data/newsroom-config.js` หากตั้ง `LINE_LOGIN_CHANNEL_ID` ฝั่ง server ต้องตรง 2011681452; `LINE_CHANNEL_ID` ของ OA อีก channel ไม่ถูกนำมายืนยัน Login ผู้ใช้ LIFF ต้องเปิด scope `openid` และ `profile` ใน LIFF เดิม

## ตรวจซ้ำ

```sh
node scripts/prepare-control.mjs
node --test tests/*.test.mjs
npx --yes deno@2.5.2 check supabase/functions/stock/index.ts
STOCK_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/verify-stock-sql.mjs
STOCK_POSTGRES_CONTAINER=chaylueklab-stock-postgres-check node scripts/verify-stock-concurrency.mjs
node scripts/verify-stock-browser.mjs
```

PGlite ตรวจ SQL/constraints/RLS/permissions/RPC จริงใน database แยก; runner concurrency ใช้ PostgreSQL Docker สอง session จริง พิสูจน์ row/advisory lock, oversell, idempotency, stale adjustment และ revoke ไม่มี production connection Browser verifier ใช้ fixtures ที่ติดป้ายชัด ไม่มีการปลอมผลผลิตหรือการขายจริง

Supabase performance advisor ไม่พบ foreign key index ที่ขาดหลัง migration เพิ่มเติม `unused_index` สำหรับตารางใหม่ยังไม่ใช่เหตุผลให้ลบ index; RLS no-policy เป็นการปิด direct browser access ตามตั้งใจ ส่วน warning `rls_auto_enable()` เป็น function เดิมนอกโมดูลนี้ ต้องแยกตรวจตาม https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
