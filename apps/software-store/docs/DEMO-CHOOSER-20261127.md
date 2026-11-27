# ภาพหน้าจอจริงในหน้าเลือก Demo — 27 พฤศจิกายน 2026

คำขอ: ให้เห็นหน้าจอโปรแกรมในหน้าเลือก Demo จาก iPhone แทนภาพไอคอน

หน้า `/demo` ใช้ภาพที่จับจากโปรแกรมทดลองซึ่งเปิดทำงานจริงทั้งสามระบบ: เว็บไซต์และข่าวโรงเรียนของ MET School Pro, แบบฟอร์มสมัครเรียนของ MET Admission และหน้าตัวกรอง/สรุป/รายชื่อของ MET Attendance ภาพและปุ่มเปิดระบบไปยัง Demo เดียวกัน

จับภาพด้วย Chromium จาก Production source `7342451193b09728c2579f82a5a2946841fb8275`, deployment `dpl_8v4tjHWSkcmgKaQQmcV2oQHehxw2` ที่มีอยู่ก่อนแก้ไข ใช้ข้อมูลสมมติ ไม่มี POST หรือการส่งใบสมัคร ไม่สร้างภาพจำลองด้วยเครื่องมือสร้างภาพ ดู SHA-256/ขนาด/URL ต้นทางใน `DEMO-PREVIEW-CAPTURES-20261127.json`

รับการปรับธีมจาก Branch เดิม `codex/premium-store-20261127` ด้วย fast-forward เข้าสู่ `feature/woramet-school-store-20261124` ก่อนแก้ จึงมี Midnight Gold/Aurora/Graphite และปุ่มควบคุมการแสดงผลของเว็บปัจจุบันอยู่ครบ ไม่แก้ main, DNS, payment gates หรือ Hosted DB

สำรอง Git ก่อนแก้ไว้ใน `/workspace/scratch/store-backups/before-demo-screenshots-20261127.bundle` และ `before-demo-preview-source-20261127.bundle` การ rollback UI ให้ใช้ commit ของ store ก่อนเพิ่มภาพ โดยตรวจ deployment ปัจจุบันอีกครั้งก่อนดำเนินการ

ภาพคงป้ายข้อมูลสมมติ ภาพตัวอย่างไม่ใช่หลักฐานว่าสินค้าเปิดขายหรือเชื่อม Hosted Supabase แล้ว แพ็กเกจ RC.3 ที่ส่งมอบก่อนหน้านี้ยังใช้ hash ตาม RELEASE-MANIFEST ไม่เขียนทับ ZIP เดิมจากการปรับหน้าร้านครั้งนี้

ชุด browser audit ที่รับมาจากการปรับธีมใช้ output path `/workspace/library-files` ซึ่งผูกกับเครื่องเดิม ปรับให้เขียนใน `test-results/premium` เพื่อรัน CI ได้ โดยไม่ปิดหรือข้ามการตรวจ

ผลทดสอบและ Preview จะบันทึกใน PROJECT-STATUS.md เมื่อรันผ่านจริง
