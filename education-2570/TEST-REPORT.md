# Test Report — Education 2570

วันที่ 26 พ.ย. 2026 · Asia/Bangkok · สาขา `feature/education-2570` · ฐานเดิม `9df07e2af1195132ee216d49199a54702c1ea26c`

## ผลทดสอบที่ทำจริง

| รายการ | ผล | หลักฐาน / ขอบเขต |
|---|---|---|
| ESLint 10.15.0 | PASS | `evidence/lint.log` |
| Unit / API contract / Security regression | PASS 34/34 | `evidence/unit-api-security.log`; mock HTTP ไม่ใช่ live Supabase |
| PostgreSQL 17 integration | PASS 12/12 | `evidence/database-tests.log`; localhost fixture เท่านั้น |
| Playwright Desktop Chromium + iPhone WebKit | PASS 28/28 | `evidence/e2e.log`, `evidence/playwright-results.json`; 14 scenarios × 2 engines, ไม่มี skipped tests |
| Static build | PASS | `evidence/build.log` |
| Artifact / migration security | PASS | `evidence/artifact-security.log`; ไม่พบ private files/known secret patterns/out-of-scope DDL ใน artifact |
| npm audit | PASS | `evidence/npm-audit.json`; 0 vulnerabilities ณ เวลาตรวจ ไม่ใช่การรับประกันในอนาคต |
| Local smoke | PASS | `evidence/local-smoke.log`: homepage/config/catalog HTTP 200 |
| Query plan / FK indexes | PASS (local) | `evidence/query-plan.json`; ยืนยัน index eligibility ไม่ใช่ production benchmark |
| Scope / diff formatting / workflow YAML | PASS (local) | `git diff --check`; YAML parses; เปลี่ยนเฉพาะ education-2570 และ workflow ของ Education |
| Figma connection / structure / font | PASS | file RzDmHcof1KJA13U8dHKMiV, Desktop/Mobile, Noto Sans Thai, no flattened UI images |
| Supabase live inventory / migration / Auth / RLS | BLOCKED | MCP binding failed; CLI ไม่มี credentials; ไม่ได้ apply |
| Vercel Preview / remote smoke | BLOCKED | target project 404 และ search ไม่พบ; CLI loggedIn=false; ไม่มี Preview URL |
| Hosting commercial entitlement | BLOCKED | ยังยืนยันแพ็กเกจ/สิทธิ์ใช้งาน Team ไม่ได้ ไม่มีการอัปเกรดหรือสร้าง paid resources |
| Windows / iPhone เครื่องจริง | NOT TESTED | ใช้ browser engines บน Linux และ viewport emulation |
| PDF output/content บนเครื่องจริง | NOT TESTED | ทดสอบปุ่มเรียก browser print และข้อมูลสาธิต; ไม่อ้างว่า official PDF generator ผ่านแล้ว |
| Live penetration/load/accessibility audit | NOT TESTED | มี targeted regression/keyboard checks ไม่ใช่ full audit |
| Phase B–D real modules | NOT TESTED / ยังไม่พัฒนา | Catalog ตามแผนเท่านั้น; เดโมเดิม 3 ตัวผ่าน E2E |

## กรณีสำคัญ

- Public store: 14 categories / 17 products, ภาพโหลดจริง, no horizontal overflow, search/filter/empty states, details ไม่อ้าง e-GP และไม่แสดง demo ของโปรแกรมที่ยังไม่มีระบบ
- Compare จำกัด 3, เก็บเฉพาะ slug, เปรียบเทียบ/นำออก/รีเฟรชได้
- ข้อสอบเดิม: สร้างโจทย์ 3 ข้อ ทำคำตอบตรงเฉลยได้ 3/3, เกียรติบัตร escape HTML, ปุ่ม Print เรียก print จริง
- Quotation draft ไม่อ้างว่าส่งแล้ว, HTML input ปลอดภัย, authenticated UI (mock) ต้องเลือกโรงเรียนและยืนยันก่อน POST, server ไม่รับราคาหรือ created_by จากผู้ใช้
- Login/cookie/CSRF/Origin/content-type/payload limit, JWT forwarding/profile, malformed IDs/unknown actions, cross-school deny, no self-escalation, student ไม่ขอราคา/ออกสิทธิ์, secret/service-role key ถูกปฏิเสธ
- DB: รักษา 10 tables และ 12 FK indexes เดิมใน fixture, RLS ทุก 21 tables รวมการจำลอง default grants ที่กว้าง, anon read scope, cross-tenant read/write deny, audit/notifications atomic, read_at-only notifications, customer contact-name-only update, composite FK, expiry/revocation/subscription/module readiness และ provision RPC rollback
- Admin/customer UI เป็น mock HTTP scenarios; การตรวจ transaction/RLS เป็น PostgreSQL จริงท้องถิ่น ทั้งสองอย่างยังไม่แทน live Supabase end-to-end

## การแก้จากผล FAIL ระหว่างพัฒนา

- พบ FK ของ members ไม่มี leading index ใน fixture → เพิ่ม index `(school_id,user_id)` โดยไม่ลบ index เดิม → รันทดสอบผ่าน
- พบ H1 ซ้ำหน้ารายละเอียด → เหลือ H1 เดียว → E2E ผ่าน
- WebKit ไม่ได้โหลด lazy images ที่อยู่นอก viewport ก่อนตรวจ → ให้ test scroll ไปตรวจการโหลดภาพจริง → ผ่าน
- ตัวเลือก E2E ของ select แบบ implicit label ไม่ตรง → ใช้ accessible combobox role/name → ผ่านทั้งสอง engines
- พบ skip link กระทบ hash router → ให้ focus main โดยไม่เปลี่ยน route และเพิ่ม keyboard regression → ผ่าน

ผล FAIL เหล่านี้แก้แล้ว ผลสุดท้ายอยู่ใน log ด้านบน ไม่ได้นับการรันที่ล้มเหลวเป็น PASS

## สภาพแวดล้อม Browser

Chromium ใช้ `/usr/bin/chromium`; WebKit 27.2 ผ่าน Playwright 1.65.1. ไม่มี root password สำหรับ apt install-deps จึงดาวน์โหลด Debian libraries แบบ user-local และวาง symlink ใน browser cache. ยืนยัน libraries load แล้ว แต่ dependency checker ที่อาศัย ldconfig ยังแจ้ง libGLESv2 จึงตั้ง `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` **เฉพาะการรัน local นี้** หลังตรวจ runtime. ตัว WebKit เริ่มทำงานจริงและรันครบ 14 scenarios ไม่มี test ถูก skip. CI ใช้ `playwright install --with-deps chromium webkit` ปกติและไม่ตั้งตัวแปรนี้

คำสั่งหลัก:
```bash
npm run lint
npm test
npm run test:db
npm run build
npm run check:security
npm audit --audit-level=high
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
node scripts/smoke.mjs
```

ภาพที่ตรวจด้วยตา: `evidence/home-Desktop-Chromium.png`, `evidence/home-iPhone-WebKit.png`. ไม่มีข้อมูลส่วนบุคคลจริงในภาพหรือ fixture
