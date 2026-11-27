# Database — education_2570

Target: Supabase Primary / `yobymeygbfiwlngmwjcn` / schema `education_2570`.

## Live inventory: BLOCKED

MCP เรียกด้วย account Primary ไม่สำเร็จ (`Unknown tool: supabase.get_project/list_projects` หลังต้องการ link_id). Supabase CLI 3.4.0 `whoami` แจ้งไม่มี access token. จึง **ไม่ได้อ่าน live schema, ไม่ได้ apply DDL, ไม่ได้อ่านข้อมูลลูกค้า/นักเรียนจริง**

ข้อมูลตารางเดิมอ้างอิงจาก source/API/index SQL ของสาขา ไม่ใช่ export จริง: `schools`, `members`, `programs`, `catalog`, `exams`, `exam_questions`, `exam_attempts`, `certificates`, `quotes`, `quote_items`. รักษาไฟล์ 12 FK indexes เดิม `sql/education_2570_fk_indexes.sql` ไว้ครบ

ก่อน apply ใช้ `sql/inspect-existing.sql` (read-only, ไม่อ่าน records) เก็บ columns, constraints, indexes, RLS, policies, grants และยืนยันว่า schools.id เป็น UUID, members มี school_id/user_id/role ตามสัญญา API

## Migration ที่เตรียมไว้

สร้างชื่อไฟล์ด้วย Supabase CLI `migration new platform_phase_a --workdir .`:
`supabase/migrations/20261126081116_platform_phase_a.sql`

Migration ใช้ transaction, lock timeout 5s, statement timeout 30s, preflight ตารางเดิมทั้ง 10 ต้องมี RLS และ schools.id เป็น UUID. ล้มเหลวจะ rollback ไม่ใช้ DROP/RENAME ตารางเดิมหรือแก้ข้อมูลเดิม

| ตารางใหม่ | วัตถุประสงค์ / การเข้าถึง |
|---|---|
| software_categories | หมวด 14 หมวด, public read |
| software_modules | 17 ผลิตภัณฑ์, status/flag/quotation mode, public published read, admin เปลี่ยนเฉพาะ enabled |
| platform_admins | bootstrap ผู้ดูแลกลางโดย owner; ผู้ใช้ดูได้เฉพาะแถวตน |
| school_subscriptions | Subscription logical ของโรงเรียน ไม่เกี่ยวกับการชำระเงินจริง |
| licenses | License ผูก school/module/subscription และ expiry |
| school_module_entitlements | สิทธิ์ module ต่อโรงเรียน, unique school+module, composite FK ป้องกัน license ข้าม tenant |
| customers | ชื่อผู้ติดต่อขั้นต่ำต่อบัญชี/โรงเรียน ไม่เก็บข้อมูลนักเรียน |
| quotation_requests | คำขอราคา THB ไม่มีราคาหรือยอดเงินที่กำหนดเอง |
| service_requests | รับเรื่องและสถานะงานบริการ |
| audit_logs | append-only ผ่าน trigger; ไม่เก็บสำเนาข้อมูลส่วนบุคคล |
| notifications | ข้อความแจ้งเตือนเฉพาะผู้ใช้/โรงเรียน, เปลี่ยนได้เฉพาะ read_at |

เพิ่มเพียง Index `(school_id,user_id)` บน members และ policy SELECT schools สำหรับ platform admins ที่ตรวจสิทธิ์จากตารางใหม่ ไม่เปลี่ยน policy/index เดิม. ตารางใหม่ทุกตารางมี PK/constraints/indexes/RLS; FK ใหม่ทุกตัวมี leading index

## Verification ที่ทำจริง

PostgreSQL 17 ใน Docker ท้องถิ่น, baseline fixture ใน `tests/db/baseline.sql` **จำลองสัญญาเดิม ไม่ใช่ Supabase จริง**:

- Migration รันสำเร็จ ได้ 21 ตาราง; 10 ตารางและ index definitions เดิมยังอยู่ครบ
- Public sentinel table ที่อยู่นอก schema ไม่เปลี่ยน
- anon อ่าน published registry ได้ แต่เข้าคำขอไม่ได้
- สองโรงเรียนทดสอบอ่าน/เขียนข้ามกันไม่ได้, ยกสิทธิ์ตัวเองไม่ได้, เปลี่ยน owner/contact identifiers ไม่ได้
- Audit + notification พร้อมคำขอเป็น transaction เดียว
- License/Entitlement ไม่สามารถอ้าง License ของอีกโรงเรียน; RPC duplicate ล้มเหลวโดยไม่ทิ้ง License ค้าง
- หมดอายุ/เพิกถอน/Subscription ระงับ/Module trial ไม่ผ่าน can_use_module
- ตรวจ FK indexes; `evidence/query-plan.json` เป็น EXPLAIN บน fixture เล็ก โดยปิด seqscan **เพื่อยืนยัน index eligibility เท่านั้น ไม่ใช่ production benchmark**

## Apply / exposure / rollback

ยังไม่ apply อัตโนมัติ. เมื่อเชื่อม Primary ได้ ต้อง inventory และเทียบ migration, ตรวจ advisors แบบอ่านอย่างเดียว, ทดสอบ staging ตามสิทธิ์ที่มีโดยไม่สร้าง paid branch, แล้ว apply เฉพาะไฟล์นี้ผ่าน MCP migration ที่ target ถูกต้อง. ห้ามรัน migration เว็บหลักจาก root

Data API ต้อง expose education_2570 และตรวจ grants/RLS จริงก่อนเปิด feature flag; ไม่เปลี่ยน global exposure โดยคาดเดา. Supabase changelog มีการเปลี่ยนการ expose tables อัตโนมัติ จึงต้องยืนยัน endpoint ด้วย anon/real JWT

หาก apply transaction ล้มเหลว Postgres rollback ให้. หลัง deploy สำเร็จ หากต้องย้อนรุ่นให้ปิด EDU_PLATFORM_ENABLED และคงตาราง/ข้อมูลไว้ ห้าม DROP ตารางเพื่อ rollback โดยไม่มี backup และอนุมัติแผนที่ชัดเจน. ไม่มีตาราง Module Phase B–D ที่ยังไม่มีระบบรองรับ
