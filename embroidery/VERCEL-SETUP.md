# สถานะตั้งค่า Vercel ตามคู่มือทางการ

คู่มือที่อ่านและดำเนินการ: https://vercel.com/get-started.md

- CLI: ติดตั้ง global ใน user scope เวอร์ชัน **67.0.0** ยืนยันตัวตนเป็น `waramatw2546-4532` และสิทธิ์ OWNER ของ Team เดิมแล้ว
- Guidance: พยายามติดตั้ง Vercel plugin สำหรับ Codex ตามคู่มือ แต่ registry ตอบว่า plugin ไม่มีใน curated marketplace หลังตรวจ plugin docs แล้วจึงติดตั้ง **standalone skills 9 รายการ** จาก vercel-labs/agent-skills ใน user scope แทน ไม่มี local plugin และ standalone pack ติดตั้งซ้ำกัน
- MCP ในแชต: เครื่องมือ Vercel ที่เชื่อมต่อสามารถค้นเอกสารและอ่านรายการทีมที่ยืนยันตัวตนแล้วได้ แต่การมองเห็นโปรเจกต์/สิทธิ์สร้างโปรเจกต์ของ connection นี้มีข้อจำกัด จึงใช้บัญชี CLI ที่ตรวจสิทธิ์ OWNER แล้วสำหรับงาน Deploy
- MCP สำหรับเรียก Codex CLI โดยตรง: เพิ่ม global entry ชื่อ `vercel` ที่ **https://mcp.vercel.com** แล้ว โดยใช้คำสั่ง Codex merge config และไม่แทนค่าตั้งค่าอื่น ไฟล์ `/home/agent/.codex/config.toml`; สถานะ OAuth ของ local Codex คือ **not_logged_in** จึงยังไม่อ้างว่า local MCP login เสร็จ หากใช้ Codex CLI โดยตรงต้องยืนยัน OAuth ใน client นั้นก่อน การ Deploy ครั้งนี้ใช้ Vercel CLI ที่ยืนยันแล้ว
- ไม่เปลี่ยนค่าเริ่มต้นการอนุมัติ MCP mutations และไม่ใช้ Production deployment
- ไม่ต้อง reload สำหรับ CLI และเครื่องมือในแชตที่ใช้ตรวจแล้ว

## เว็บที่ทดสอบผ่าน

https://chailueklabaivercelready-nctmz3p4a-waramatw2546-4532.vercel.app

Environment **preview**, deployment `dpl_717dN2ic54AFr5xPgkfLaj43owYX` จาก source `88829abb073e8d59b3ebfa488f17b8f00db44493` เว็บไซต์และ API แปลงไฟล์ผ่านการทดสอบ cloud แล้ว Preview คง Vercel Authentication ไว้ ผู้เปิดต้องใช้บัญชีที่มีสิทธิ์ในทีม

ข้อมูลสรุปที่ตรวจจริง: `reports/cloud-preview/vercel-setup.json` หลักฐาน API, browser และ Production เดิมอยู่ในโฟลเดอร์เดียวกัน ไม่มี token, password, short-lived login code หรือ bypass secret ในหลักฐาน
