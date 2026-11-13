# ผลตรวจและ QA — 13 พฤศจิกายน 2026

ขอบเขต: Repository `Metmetza88/chaylueklab`, สาขา `feature/woramet-dojo-mvp-20261113`, Business Insights และระบบ/เอกสารที่เกี่ยวข้อง ตรวจจากโค้ดจริง ไม่อาศัยชื่อหรือเนื้อหาแชตอ้างอิง เพราะ session นี้ไม่มีเครื่องมือ `read_thread` ให้เรียก

## ระบบเดิมก่อนแก้

Baseline Commit: `718be4df63fe782d58a06a97f6f0bb0c7b26e20b`

รันจริง: `node --test ai-money-studio/tests/business-insights.test.cjs` → **9 tests, 9 pass, 0 fail**

อ่านไฟล์ HTML, app.js, tests และ DOJO-READINESS ใน ai-money-studio รวมถึงโครงสร้าง Repository, build/public artifact, workflow Pages/CI, vercel.json, เอกสาร AI และโค้ด provider ที่เกี่ยวข้อง ไม่แก้ระบบขาย/LINE/ชำระเงินหรือ Supabase เดิม

| ส่วนเดิม | สถานะจากโค้ดและชุดทดสอบ |
| --- | --- |
| นำเข้า CSV และรวมยอด/อันดับ | ทำงานในเบราว์เซอร์ แต่ parser และตัวเลขยังตรวจได้ไม่ครบ |
| รายงาน TXT/คัดลอก | มีการสร้างผลลัพธ์จริง แต่ยังขาดการป้องกัน state เก่าบางเส้นทาง |
| วันที่/แนวโน้ม | วันที่ถูกละเว้น ไม่ได้คำนวณแนวโน้ม |
| ข้อสังเกตและข้อความโปรโมต | สูตร/กฎ/เทมเพลต ไม่ใช่ model inference |
| AI SELLER ในหน้า index | 5 เทมเพลตทำงาน อีก 15 เครื่องมือระบุรอเปิดใช้ ไม่ใช่ AI API |
| สมาชิก/เครดิตในหน้า Studio | ข้อความสถานะเตรียมพัฒนา ไม่เปิดบริการจากหน้านี้ |
| Provider ในส่วนอื่นของ Repository | พบโค้ด OpenAI, Gemini/Runway และ worker สำหรับงานอื่น ไม่ยืนยันว่าตั้งค่า/ออนไลน์หรือได้รับอนุญาตให้ใช้กับ WORAMET |

ปัญหาที่พบและแก้:

- การลบ comma ออกจากตัวเลขทุกตำแหน่งอาจยอมรับหลักพันผิดรูปแบบ; ใช้ grammar ตรวจจำนวน ราคา และ encoding ชัดเจนแทน
- ไม่ตรวจคอลัมน์ซ้ำ ความหมายซ้ำ หรือจำนวนช่องต่อแถว; ตอนนี้ปฏิเสธไฟล์กำกวมและแจ้งตำแหน่งให้แก้
- เงินทศนิยม/ยอดใหญ่เสี่ยง precision; คำนวณเป็นสตางค์ ตรวจ safe integer รวมถึงแสดงผลโดยไม่หารทศนิยมจนสตางค์หาย
- งานอ่านไฟล์เก่าอาจกลับมาเขียนทับหลังแก้/ล้าง/เลือกไฟล์ใหม่; ใช้ revision token ยกเลิกผลเก่าทุกเส้นทาง
- เมื่ออ่านไฟล์ใหม่ไม่สำเร็จ CSV เก่าอาจยังวิเคราะห์ได้; ตอนนี้ล้าง input เก่าตั้งแต่เริ่มอ่านและปิด analyze ชั่วคราว
- เมื่อวิเคราะห์ผิดพลาดเดิมซ่อน panel แต่ยังเหลือ report/post snapshot; ตอนนี้ล้าง snapshot, DOM และปิดปุ่ม export/copy ทุกครั้ง
- เพิ่มรายการขายรายวันและเปรียบเทียบช่วงเท่ากันเฉพาะเมื่อข้อมูลพอ ไม่มีการสร้างยอดวันที่หาย
- เสริม CSP ไม่เชื่อมเครือข่าย ไม่มี HTML injection, จำกัดขนาดทั้งไฟล์และข้อความวาง ป้องกัน control/bidi/Unicode line separator ในชื่อสินค้า
- เปลี่ยนหน้าจอเป็นดำ–ทอง–เงิน พร้อมฟ้า/ม่วงตามภาพแบรนด์ ปุ่มและฟอร์มเหมาะกับจอเล็ก โหลดฟอนต์จาก Repository เอง สัญลักษรใช้ SVG เพื่อไม่เป็นกล่องเมื่อเครื่องไม่มีฟอนต์

## ผลทดสอบหลังแก้

สภาพแวดล้อม: Linux, Node.js **24.19.0**, Playwright **1.64.1**, Chromium **151.0.7922.173**

| คำสั่ง/การตรวจ | ผลจริง |
| --- | --- |
| `node --test ai-money-studio/tests/*.test.cjs ai-money-studio/tests/*.test.mjs` | **85 tests, 85 pass, 0 fail** |
| `node --test tests/*.test.mjs` | **124 tests, 124 pass, 0 fail** (regression ของ Repository เดิม) |
| `node --check` สำหรับ core, controller, server และ boundary | ผ่าน |
| `node scripts/verify-public-site.mjs` | ผ่าน |
| `node scripts/build-public-site.mjs _site-woramet-qa` | สร้าง artifact ในเครื่องได้; ตรวจว่ามี assets Insights และไม่มี `server/`, `supabase/` |
| `git diff --check` | ผ่านหลังเก็บ whitespace เอกสาร |

รันรวมทั้งสองชุดครั้งสุดท้ายได้ **209 tests, 209 pass, 0 fail** เก็บผลจริงที่ [node-tests.txt](../docs/woramet-qa/node-tests.txt)

ชุด 85 ข้อครอบคลุมยอดตัวอย่าง สตางค์/ทศนิยม/ยอดรวมล้นขอบเขต encoding UTF-8/UTF-16/Windows-874, CSV ไทย/อังกฤษ/เลขไทย/ตัวคั่น/อัญประกาศ วันที่จริงและ พ.ศ., แถวผิด, คอลัมน์ซ้ำ, วันที่หาย, ฐานแนวโน้มเป็นศูนย์, XSS/control characters, การเก็บข้อมูลนอก schema, stale report/file/copy และ report/download ตลอดจน AI boundary แบบปิด/ไม่มีสิทธิ์/โควตา/timeout/ปกปิด error

ทดสอบ AI ใช้ **mock adapter เท่านั้น** ไม่ใช่หลักฐานว่าเรียก Generative AI จริง ไม่มีการทดสอบหรือเรียกโมเดลแบบเสียเงิน

## เบราว์เซอร์และมือถือ

รันจริง:

```sh
PLAYWRIGHT_MODULE=/workspace/setup-tools/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node ai-money-studio/tests/business-insights.browser.cjs
```

นี่คือ paths ของเครื่อง QA นี้ ไม่จำเป็นต้องตรงกับเครื่องเจ้าของ ดูวิธีติดตั้งฟรีใน README

| Viewport | Engine / OS | ผล |
| --- | --- | --- |
| 320 × 640 | Chromium / Linux, mobile/touch emulation | ผ่าน |
| 375 × 812 | Chromium / Linux, mobile/touch emulation | ผ่าน |
| 390 × 844 | Chromium / Linux, mobile/touch emulation | ผ่าน |
| 430 × 932 | Chromium / Linux, mobile/touch emulation | ผ่าน |
| 1440 × 900 | Chromium / Linux | ผ่าน |

แต่ละขนาดทดสอบ: โหลด assets → quick demo → sample totals → แก้ CSV แล้วซ่อนผลเก่า → import CSV ไทย 14 วัน → เปรียบเทียบช่วง → ดาวน์โหลด TXT/JSON และตรวจเนื้อหาจริง → ชื่อสินค้าที่เป็น HTML ไม่ทำงาน → ชื่อยาว/ยอดใหญ่ไม่ทำให้หน้าเลื่อนแนวนอน → ข้อมูลผิด → ล้างข้อมูล ไม่พบ JavaScript/CSP errors หรือคำขอออกนอก local preview ระหว่าง flow เหล่านี้

ภาพ 390px และ 1440px ได้ตรวจด้วยสายตาแล้ว: ข้อความไม่ล้น ปุ่มอ่านได้ สีและสัญลักษรแสดงครบ การจำลอง viewport ไม่เท่ากับอุปกรณ์จริง

หลักฐานที่ Commit ด้วยมีเฉพาะข้อมูลสมมติ:

- [สรุป Browser JSON](../docs/woramet-qa/chromium-summary.json)
- [มือถือ: หน้าเริ่ม](../docs/woramet-qa/chromium-iphone-390-start.png) / [มือถือ: ผลวิเคราะห์](../docs/woramet-qa/chromium-iphone-390-results.png)
- [เดสก์ท็อป: หน้าเริ่ม](../docs/woramet-qa/chromium-desktop-1440-start.png) / [เดสก์ท็อป: ผลวิเคราะห์](../docs/woramet-qa/chromium-desktop-1440-results.png)

## สิ่งที่ยังไม่ทดสอบหรือยังไม่มี

- **ยังไม่ทดสอบ Safari บน iPhone จริง และ Windows/Edge จริง** รวมถึงการเลือกไฟล์ ดาวน์โหลด และ clipboard บนอุปกรณ์เหล่านั้น
- ลองติดตั้งและเปิด Playwright WebKit แล้ว แต่ launch ไม่ผ่านเพราะขาด `libgtk-4`, `libgraphene`, `libharfbuzz-icu`, `libmanette`, `libhyphen`, `libGLESv2` เครื่องนี้ไม่มี scoped package helper หรือ sudo จึงไม่เปลี่ยนสิทธิ์ระบบเพื่อฝืนติดตั้ง
- `file://` ถูกนโยบาย Chromium ของเครื่อง Cloud ปิดกั้น (`ERR_BLOCKED_BY_ADMINISTRATOR`) จึงยังไม่รับรองวิธีเปิด HTML ตรง ๆ การทดสอบ HTTP ผ่านเซิร์ฟเวอร์ local สำเร็จ
- Clipboard success/failure และ stale completion ทดสอบด้วย stub; ยังไม่ใช่การตรวจ clipboard ของ iOS จริง มีบันทึกร่าง TXT เป็นทางเลือก
- มี labels, focus styles, live status, reduced-motion CSS และขนาดปุ่มสัมผัส แต่ยังไม่มีการทดสอบ VoiceOver/ผู้ใช้จริงหรือ accessibility audit เต็มรูปแบบ
- ไม่มี live Generative AI, auth/tenant store, ledger/โควตาถาวร, ระบบขายจริง, ต้นทุน/คืนสินค้า/ส่วนลด, พยากรณ์ หรือการเชื่อมข้อมูลร้านอัตโนมัติ
- ยังไม่มีผลทดสอบประโยชน์กับเจ้าของร้านจริง วิดีโอที่อัดเสร็จ หรือ URL ทดลองที่ Deploy แล้ว

## ขอบเขตความปลอดภัยและการแข่งขัน

ไม่อ่านค่าความลับจากระบบจริง ไม่ส่งข้อมูลร้านจริงหรือ API key ไปที่ใด และไม่เรียก paid provider โค้ด server อยู่นอกโฟลเดอร์ที่ build เป็นเว็บสาธารณะ ตัว build เดิมคัดลอกเอกสาร/tests/fixtures ภายใต้ ai-money-studio ด้วย จึงใช้เฉพาะข้อมูลสมมติและไม่มี secret ในไฟล์เหล่านี้

แก้เฉพาะสาขาทดลอง ไม่แก้ main ไม่ Merge ไม่แก้ workflow/การตั้งค่าโฮสต์ และไม่ Deploy ตรวจ Pages workflow แล้วสาขานี้ไม่อยู่ในรายชื่อ branch ที่ publish; การค้นหา Vercel project ที่เชื่อม Repository ผ่านบัญชีที่เข้าถึงได้ครั้งนี้ไม่พบผล (ไม่ใช่ข้อพิสูจน์ว่าไม่มี integration ในบัญชีอื่น)

ภาพที่เจ้าของส่งใช้เป็นแนวทางสีและวัสดุใน CSS สัญลักษร W/SVG เป็นเวกเตอร์เรียบง่ายของหน้านี้ ยังไม่ได้ฝังไฟล์ภาพโลโก้ต้นฉบับ เพราะไม่มีไฟล์แนบดังกล่าวที่อ่านได้ใน workspace ครั้งนี้

ก่อนส่ง Dojo ต้องยืนยันกติกาโค้ดก่อนแข่ง ชื่อ Track และ Marketplace กับผู้จัด รวมถึงอนุมัติ Deploy/AI/งบประมาณ/การเผยแพร่จากเจ้าของ ดู [DOJO-READINESS.md](DOJO-READINESS.md)
