# อัปเดตหน้า Life OS จาก ZIP ของผู้ใช้

`index.html` ใช้ไฟล์ `CHAYLUEKLAB-premium59-snooze.zip` ที่ผู้ใช้ส่งมา รวมลิงก์ Control Center / AI Video / Newsroom เดิมและ callback `view=stock`/`view=control` หลัง `liff.init()` เสร็จ `notes.html` ใน repo ตรงกับไฟล์ ZIP อยู่แล้ว รวมดีไซน์และฟอนต์ไทยของ Control Center patch ที่ส่งเพิ่มโดยให้ `control.html`/`stock.html` ใช้ข้อมูลกลางชุดเดียวกัน ดู `CONTROL-CENTER.md`

แก้การส่ง `recurringConsent` ให้ server ของ PR #1 ตรวจความยินยอมต่ออายุได้; ไม่เปิดสิทธิ์จาก URL ที่ Stripe ส่งผู้ใช้กลับ หน้าเลื่อนเตือนอ่านข้อมูลจาก API ของบัญชีจริง ไม่รับชื่อเรื่องจาก URL และใช้ request ID เดิมเมื่อผลตอบกลับขาดหาย

ตรวจ public billing API เดิม `https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1/billing` ได้จริง: 5900 สตางค์ THB/เดือน, trial 7 วัน, quotas Free/Plus ตรงกับผู้ใช้ทุกช่อง, `checkoutReady:false`, `mode:unconfigured` จึงยังรับเงินจริงไม่ได้ ไม่ได้ overwrite backend ของ project นี้จาก ZIP

ตั้ง `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` ใน **Supabase project bxaplhrunxiadjsdobyl → Edge Functions → Secrets** เท่านั้น: https://supabase.com/dashboard/project/bxaplhrunxiadjsdobyl/functions/secrets

หลังเจ้าของส่งภาพ “You do not have access to this project” ตรวจยืนยันว่าบัญชีที่เชื่อมต่อเข้าถึงได้เฉพาะ `Metmetza88's Project` (`yobymeygbfiwlngmwjcn`) การจัดการโปรเจกต์ Life OS เดิมถูกปฏิเสธ ต้องเข้าบัญชีที่มีสิทธิ์หรือรับคำเชิญให้จัดการโปรเจกต์เดิมก่อนตั้ง Stripe Secrets ดู `PAYMENTS.md` การเพิ่มคีย์ในโปรเจกต์ที่มีเฉพาะ Stock/Newsroom/Video ยังไม่เชื่อมสิทธิ์สมาชิก Life OS เดิม และไม่ได้เปลี่ยน API URL เพื่อข้ามปัญหานี้

Webhook ใน Stripe คือ `https://bxaplhrunxiadjsdobyl.supabase.co/functions/v1/stripe-webhook` ใช้ signing secret ของ endpoint และ mode เดียวกับ key ทดสอบ checkout → webhook → Plus → renewal/payment failure → cancel-at-period-end ด้วย Stripe test mode ก่อน live

GitHub PR #1 ถูกปิดโดยยังไม่ Merge เมื่อ 6 ตุลาคม 2026 10:53 UTC งานที่รวม source เดิมเสนอผ่าน branch `fix/control-center-plus59` และ Draft PR ใหม่ โดยไม่เปิด PR #1 กลับ การเชื่อม ChatGPT Codex Connector เขียน source ได้แล้ว และเจ้าของบันทึกข้อยกเว้น review branch ในกฎ M เรียบร้อย ก่อน Merge ต้องคืนข้อกำหนดการสร้าง/อัปเดต/ลบและ code coverage ที่หายไปจากกฎที่บันทึกล่าสุดตาม `CONTROL-CENTER.md` การเชื่อมต่อนี้ไม่มีสิทธิ์ administration และไม่ได้แก้ ruleset หรืออัป frontend production

รวม source ของ PR #1 (`c8105eb`) และ resolve conflict ใน .gitignore, index.html, index.ts, Supabase config และ shared membership แล้ว โดยเก็บ admin-key alias/owner เดิม, requirePost ของ video และ quota exports ของ billing; webhook รับแพ็กเกจ 99 เดิมที่ตรงเงื่อนไข ส่วน checkout ใหม่ยังเป็น 59 เท่านั้น การรวม source นี้ไม่ได้ Merge PR #1 บน GitHub หรือติดตั้ง billing backend ใน Supabase แทนเจ้าของ

ตรวจเว็บ GitHub Pages จริงด้วย browser ที่ใช้ SDK จริงแล้วไปถึงหน้า LINE Login ไม่มี JavaScript error ในเส้นทางก่อน login ตรวจหลัง login ของผู้ใช้จริงไม่ได้โดยไม่มี session ของเขา โดเมน chaylueklab.com ตอบ 403 จาก execution network ขณะตรวจ จึงยังไม่สรุปว่าโดเมนใช้งานไม่ได้บนเครื่องผู้ใช้ หน้า GitHub Pages ยังเป็นรุ่นเก่าที่ไม่มี Snooze/Stock
