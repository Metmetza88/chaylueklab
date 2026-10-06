# ระบบอัตโนมัติของ CHAYLUEKLAB

ใช้ repository, GitHub Pages และ LIFF เดิม ไม่ต้องเพิ่ม secret ใน GitHub

## เมื่อแก้โค้ด

PR เข้า `main` ตรวจ source ที่สร้างร่วมกัน, Node tests, LIFF/Stock configuration, Deno type checks และ CodeQL ขั้นตอน Control Center ใช้ Node ตรวจ configuration จึงไม่พึ่ง `rg` ที่ไม่มีใน GitHub runner และ summary แสดงผลจริงของแต่ละขั้นตอน

Push เข้า branch ของ PR `fix/control-center-plus59` ตรวจและ build artifact ให้ดาวน์โหลดได้ โดยยังไม่ deploy เพราะ environment เดิมอนุญาตเฉพาะ `main` และ `codex/retail-control-center` รักษา trigger ที่เจ้าของเพิ่มระหว่างทำงานและไม่แก้กฎ environment

เมื่อมี push เข้า `main` หรือ publishing branch เดิม `codex/retail-control-center`:

1. Quality checks และ CodeQL ทำงานก่อน หากล้มเหลวจะไม่ build หรือ deploy
2. CodeQL gate บล็อก findings ระดับ error หรือ security severity ตั้งแต่ 7 ขึ้นไป
3. Build เฉพาะหน้าเว็บและ assets ไม่บรรจุ Edge Functions, SQL, tests หรือไฟล์ environment
4. Deploy เข้า environment `github-pages` เดิม โดยรักษา URL/domain
5. ตรวจ HTTP และ SHA-256 ของ 7 route บนเว็บจริงให้ตรงกับ release manifest และ commit ที่ผ่านการตรวจ

ดูผลและสั่งรัน workflow เดิมอีกครั้งได้ที่ [GitHub Actions](https://github.com/Metmetza88/chaylueklab/actions)

เจ้าของต้องเลือก [Settings → Pages](https://github.com/Metmetza88/chaylueklab/settings/pages) → **Source → GitHub Actions** ครั้งเดียวก่อน Merge เพื่อปิด branch publisher แบบเก่าที่อาจข้าม CI การลองตั้ง Source ผ่าน workflow ได้ HTTP 403 `Resource not accessible by integration` จึงนำขั้นตอนที่ไม่มีสิทธิ์ออกและคง deployment ที่ใช้งานได้ ไม่ได้เปลี่ยน domain, ruleset หรือสร้าง Site ใหม่

## เมื่อเกิดข้อผิดพลาด

Publishing workflow เรียกตัวแจ้งเตือนทันทีเมื่อ test, scan, build หรือ deploy ล้มเหลว ตัวแจ้งเตือนตรวจ run และ failed job จาก GitHub API ก่อนเปิด Issue แล้ว assign เจ้าของ repository การล้มเหลวซ้ำของ workflow/branch เดิมเพิ่ม comment ใน Issue ที่เปิดอยู่และไม่แจ้ง run เดิมซ้ำ ไม่แนบ log หรือ secret

หลังเจ้าของ Merge PR #6 ไฟล์ `automation-alerts.yml` จะอยู่บน default branch ทำให้ `workflow_run` แจ้งข้อผิดพลาดของ Quality checks, CodeQL และ Control Center CI ได้ด้วย Run จาก fork, branch อื่น, run สำเร็จหรือถูกยกเลิกจะไม่สร้าง Issue ขั้นตอนที่มีสิทธิ์เขียน Issue ไม่ checkout หรือรัน artifact จาก PR

GitHub ส่ง notification ตามการตั้งค่า Notifications ของเจ้าของ ไม่ได้ส่งข้อความ LINE หรือเผยแพร่ Newsroom โดยอัตโนมัติ

## ขอบเขตเว็บไซต์และหลังบ้าน

URL ที่ workflow นี้เผยแพร่คือ `https://metmetza88.github.io/chaylueklab/` และใช้ LINE LIFF เดิม เว็บ `chaylueklab.com` อยู่กับ publisher อีกระบบที่บัญชี Sites ปัจจุบันยังเข้าไม่ได้ จึงยังไม่ถูกอัปเดตจาก workflow นี้

ระบบอัตโนมัตินี้ไม่ apply SQL หรือ deploy Edge Functions โดยใช้ secret ใน GitHub รักษาการจัดเก็บ server keys ที่ Supabase เดิม Stripe ยังต้องตั้ง `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` ใน Secrets ของโปรเจกต์ Life OS เดิมและทดสอบ checkout/webhook ก่อนรับเงินจริง ไม่มีการย้ายระบบสมาชิกหรือเปลี่ยน production domain
