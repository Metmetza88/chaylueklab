# Tools / Plugins / MCP / Skills / CLI — ตรวจจริง

วันที่ตรวจ: 26 พ.ย. 2026, เวลาไทย (Asia/Bangkok), snapshot ใน `evidence/tool-inventory.json`.
จำนวน tools ที่ปรากฏไม่ใช่หลักฐานว่าเชื่อมต่อบัญชีได้ ต้องดูผลเรียกจริงด้านล่าง ไม่มีการเปลี่ยน permission หรือสมัครบริการเสียเงิน

| เครื่องมือ | สิทธิ์ที่อ่านได้ | ผลเชื่อมต่อจริง | ผลใช้งาน |
|---|---|---|---|
| GitHub Plugin | Allow all actions; repo permissions pull/push/admin=true | PASS: authenticated เป็น Metmetza88, อ่าน repo และ PR #58 ได้ | Repository เดิม, branch เดิม; ไม่มีสร้าง repo/merge |
| Supabase Plugin/MCP | Allow all actions | BLOCKED: ต้องการ link_id; ลอง selector ของ Primary แล้วได้ Unknown tool จาก backend | ไม่ได้ inventory/apply ฐานข้อมูลจริง |
| Supabase CLI 3.4.0 | ไม่มี access token ใน environment | BLOCKED: whoami ระบุ Access token not provided | ใช้เฉพาะ migration new แบบ local |
| Vercel Plugin/MCP | Allow all actions | PASS Team lookup: team_kA0EAug4JrrTT6ZIc54RXcmL; BLOCKED Project lookup: HTTP 404 not_found, list search education ได้ 0 projects | ไม่สร้าง project และไม่ deploy ไป project อื่น |
| Vercel CLI 67.0.0 | ทดสอบแบบไม่เปิด login flow | version/help PASS; whoami JSON loggedIn=false, linkedProject=null | Preview deploy BLOCKED; ไม่พบ 403 ในรอบนี้ (ผลจริงคือ 404) |
| Figma Plugin/MCP | default Allow low-risk actions | PASS: Starter/Full/admin; create file/session/design ได้ | สร้าง Auto Layout Desktop/Mobile พร้อม reusable components; ตรวจโครงสร้างและ font Noto Sans Thai |
| Adobe Plugin/MCP | Allow all actions | PASS: init และ font catalog search ตอบกลับ | ตรวจความพร้อมเท่านั้น ไม่มี Stock licensing/Gen AI/ซื้อ assets; ผล search ที่ได้ไม่ตรงคำค้นจึงไม่เลือก font จากผลนั้น |
| Gmail Plugin | default Allow low-risk actions | PASS: get_profile สำเร็จ | ตรวจเฉพาะบัญชี ไม่อ่านจดหมายและไม่ส่งข้อความ |
| Google Drive Plugin | Allow all actions | BLOCKED: ต้องการ link_id และ backend Unknown tool | ไม่เขียนไฟล์ใน Drive; เก็บเอกสารใน repo แทน |
| Composio hosted MCP | Allow all actions | PASS เฉพาะ tool discovery; ผลค้นไม่ยืนยัน Supabase/Drive account ที่ต้องการ | ไม่ใช้ toolkit ที่ไม่เกี่ยวข้อง ไม่สร้าง automation/ส่งข้อความ/ใช้ instant credits |
| Composio CLI | ไม่ติดตั้ง | NOT TESTED: command ไม่มี | ไม่ติดตั้งเพิ่ม; การติดตั้ง/ลงชื่อเข้าใช้ CLI ยังไม่จำเป็นต่องาน Phase A |
| AI SEO by VibeSEO | Skill มีอยู่ แต่ไม่พบ callable AEO/GEO tools | BLOCKED: tool inventory = 0; plugin search ไม่คืน connector ที่ตรง | ไม่สมมติผล visibility/citations; ทำเฉพาะ metadata/prerender HTML ของเว็บ |
| Plugin Management | read permissions/search สำเร็จ | PASS | ไม่เปลี่ยน permissions/ติดตั้ง/ถอน plugin |

## Skills ที่อ่านเพื่อใช้งานนี้

- Supabase (`supabase`) — current docs, RLS, keys, migration/verification
- Vercel (`vercel-cli`, monorepos reference) — ตรวจเป้าหมายเดิมก่อน deploy
- Figma (`figma-create-new-file`, `figma-use`, `figma-generate-design`) — สร้างไฟล์และแบบ UI
- Plugin Management — ตรวจ permissions และการมีอยู่ของ integration
- Adobe (`adobe-design-from-template`) — ตรวจการพร้อมใช้งาน; ไม่ได้เริ่มแก้ template เพราะไม่จำเป็นกับโค้ดแพลตฟอร์ม
- Composio (`composio`) — routing/discovery เท่านั้น; downstream automation ไม่ได้เปิดใช้
- VibeSEO (`ai-seo`) — connector prerequisite ไม่พร้อม จึงทำงานส่วนอื่นต่อตามคำสั่งผู้ใช้

ไม่มีการใช้ Cloudflare หรือบริการอื่นกับ Production. การปรากฏของ Skill ไม่ใช่การยืนยันว่า provider เชื่อมต่อสำเร็จ

## CLI และสภาพแวดล้อมที่ทดสอบ

Git, gh (authenticated repo เดิม), Node v24.19.0, npm 11.9.0, pnpm, Docker 28.4.0 และ Chromium มีอยู่แล้ว; `psql`, `supabase`, `vercel`, `composio` ไม่พบใน PATH แรกเริ่ม. Supabase CLI ติดตั้งเป็น dev dependency แบบ pin, Vercel ตรวจผ่าน npx แบบ pin เท่านั้น ไม่เก็บ token ใน repo

PostgreSQL 17 Docker ใช้เฉพาะ localhost:55470 พร้อมข้อมูลสมมติ. Playwright 1.65.1 ดาวน์โหลด WebKit; เครื่องไม่มี root password สำหรับ install-deps จึงเตรียม runtime libraries ใน user cache แทน ไม่แก้ไฟล์ระบบ. รายละเอียดข้อจำกัดการทดสอบ engine อยู่ใน TEST-REPORT.md

## ค่าใช้จ่ายและการเปิดใช้เชิงพาณิชย์

ไม่ได้สร้าง Supabase project/paid branch, ไม่สร้าง Vercel project, ไม่เปลี่ยน plan, ไม่ซื้อ Stock และไม่เรียก paid AI API. ใช้ public repo workflow และเครื่องมือท้องถิ่นทดสอบ

อ่านเอกสารทางการ Vercel Hobby/Fair Use แล้ว แต่หน้า docs ที่ได้รับไม่มีข้อความยืนยัน commercial entitlement ของ Team นี้ และ Project ไม่พบ จึง **ยังยืนยันแพ็กเกจ/สิทธิ์ใช้งานเชิงพาณิชย์ไม่ได้** ห้ามตีความว่าฟรีทุกกรณีหรือเปิดขายบนแผนที่ยังไม่ตรวจ

แหล่งอ้างอิง:
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits/fair-use-guidelines
- https://supabase.com/docs/guides/api/using-custom-schemas
- https://supabase.com/changelog

Preview pipeline ปิดโดยค่าเริ่มต้น ต้องมี verified existing Project ID, plan/use confirmation ว่าไม่เพิ่มค่าใช้จ่าย และสิทธิ์ที่ถูกต้องก่อนเปิด ไม่สมัคร/อัปเกรดแทนเจ้าของ
