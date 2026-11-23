# รายงานตรวจสอบ WORAMET AI EMBROIDERY STUDIO

วันที่: 23 พฤศจิกายน 2026 (UTC)
Repository: `Metmetza88/chaylueklab` • Branch: `feature/woramet-dojo-mvp-20261113`
ฐานก่อนแก้: `00e696e7267f7927557aada6fb76796105249d69`

## ผลที่ยืนยันได้

| การตรวจ | ผล |
| --- | --- |
| ก่อนแก้: Node tests เดิม / Build เดิม | 137/137 ผ่าน; public artifact 83 ไฟล์ |
| หลังแก้: Node tests รวมระบบเดิม | 141/141 ผ่าน |
| Python Engine + HTTP API tests | 23/23 ผ่าน |
| Build ตามคำสั่งเดิมใน vercel.json | ผ่าน; public artifact 89 ไฟล์ |
| Chromium Desktop 1440 × 1000 | ผ่าน browser regression, ไม่มี JavaScript error หรือแนวนอนล้น |
| Chromium iPhone จำลอง 390 × 664 CSS px | ผ่าน รวมการวาดจุดด้วย touch events |
| WebKit iPhone จำลอง 390 × 664 CSS px | ผ่าน รวมการวาดจุดด้วย touch events |
| ไฟล์ DST/PES/JEF จาก browser download จริง 9 ไฟล์ | pyembroidery อ่านกลับได้, มี STITCH และ END, DST จำกัดความยาวตาม tolerance หน่วย 0.1 มม. |
| SVG / PNG download ผ่าน UI | ผ่าน; SVG มี path geometry และ PNG ไม่ใช่ภาพว่าง |
| Production / Preview deployment | ไม่ได้ดำเนินการ |
| เครื่อง Tajima จริง / iPhone หรือคอมพิวเตอร์ Windows ของผู้ใช้จริง | ยังไม่ได้ทดสอบ |

Environment ที่ตรวจในเครื่องนี้: Linux, Python 3.12.14, Node 24.19.0, Pillow 12.0.0, NumPy 2.2.6, OpenCV headless 4.12.0, pyembroidery 1.5.1, Playwright 1.64.1, system Chromium และ Playwright WebKit 27.2 บน Linux เพิ่ม shared libraries สำหรับ WebKit ใน browser cache ของสภาพแวดล้อมทดสอบ ไม่ได้เปลี่ยน binary ของ browser หรือโค้ดเว็บเพื่อจำลองผลผ่าน การผ่าน WebKit จำลองไม่ใช่การทดสอบ Safari บนอุปกรณ์จริง

เพิ่ม `.github/workflows/embroidery-tests.yml` เพื่อทดสอบ Python บน Ubuntu และ Windows และ Build เดิมบน Ubuntu ผล CI จาก GitHub ให้ตรวจที่ commit ที่ส่งมอบ Workflow นี้ไม่มีขั้นตอน deploy

## สิ่งที่ทดสอบใน Engine และ HTTP

- เขียน DST binary จริง มีหัว `LA:`, คำสั่ง END และ decoded commands ตรงกับข้อมูล simulation
- ใช้ constants จาก pyembroidery แทน magic numbers; Color Change เฉพาะระหว่างกลุ่มสี ไม่มี stop หลังสีสุดท้ายและไม่ย้ายกลับ origin ตอนเปลี่ยนสี
- แบ่งเส้นยาวตาม Stitch Length รวมการตรวจผลหลัง quantize หน่วย DST 0.1 มม.; ทดสอบเส้น 50 มม. ไม่กลายเป็น stitch ยาว 50 มม.
- รักษาสัดส่วน, 1 สี foreground, 15 สี, PNG/JPEG/alpha, white background option, Underlay ก่อน fill และ Pull Compensation
- Tatami clipped angled fill และ phase staggering; ตรวจ segment sampling ที่มุม 0/30/90° ไม่ปักข้ามรูเจาะใน fixture
- Satin วาดแนวกลางสร้างสองรางสลับ, polygon fill, เปลี่ยนสี/ตำแหน่ง/ลำดับ/visibility แล้วส่งออกใหม่
- PES/JEF round-trip และปฏิเสธ EMB / Auto Satin ที่ไม่รองรับ
- ปฏิเสธ malformed JSON, non-finite numbers, unsupported media type, image format ผิด, decompression bomb, ความซับซ้อนเกินขีดจำกัด และ request ใหญ่เกิน
- แยก literal DST commands ออกจาก TRIM ที่ reader อนุมานจาก 3 jumps; รายงาน `trim_count=null`, `explicit_trim_count=0` และ `inferred_trim_count` ตามจริง ไม่รับประกันว่าเครื่องจะไม่ตัดด้าย
- CLI ใช้ Engine เดียวกัน พร้อมสร้างไฟล์สี/แบบ/รายงานคู่ไฟล์เครื่อง

## สิ่งที่ทดสอบใน Browser

เปิดตัวอย่าง → บันทึก IndexedDB → reload → เปิดประวัติ → แก้สี/Offset/ลำดับ → Undo/Redo → วาด Running/Satin/Tatami → Reshape จุดควบคุม → ลากวัตถุ → เล่น/หยุด simulation → ดาวน์โหลด DST/PES/JEF/SVG/PNG → อัปโหลด PNG → Auto Digitize 50 มม. → Local customer request → owner เปลี่ยนสถานะในเครื่อง → ส่งออก/นำเข้า JSON → เริ่มแบบว่างและวาดโดยไม่มีภาพ → ตรวจโหมด API offline ให้ดูตัวอย่างได้แต่ไม่แสร้งว่าส่งออกสำเร็จ

Browser tests ไม่ใช้ฐานข้อมูล ระบบ LIFE OS, LINE, API AI ภายนอก หรือการชำระเงินจริง ไฟล์ทดสอบและชื่อลูกค้าใน tests เป็นข้อมูลสังเคราะห์

## ตัวอย่าง 50 มม.

ต้นฉบับ `samples/synthetic-crest.png` เป็นเรขาคณิตที่สร้างเอง ไม่ใช่ตราโรงเรียนบ้านระหาร ภาพ 400 × 400 px, กว้างเป้าหมาย 50 มม. รักษาสัดส่วน 1:1, 3 สี, Tatami, มุม 30°, spacing 0.45 มม., length 2.8 มม., underlay เปิด, pull 0.15 มม.

ค่าที่อ่านกลับจาก `samples/synthetic-crest-50mm.dst`:

| ค่า | ผล |
| --- | --- |
| ขอบเขตฝีเข็ม | 42.9 × 42.8 มม. (ภาพต้นฉบับมีขอบขาว) |
| STITCH commands | 2,433 |
| สี / Color Change | 3 / 2 |
| Jump commands หลังเข้ารหัส | 872 |
| จุดลงเข็มเริ่มเส้น ระยะ 0 มม. | 557 |
| เส้นสั้น 0 < length < 0.4 มม. | 121 |
| ความยาวสูงสุดหลัง quantize DST | 2.807 มม. |
| เวลาโดยแบบจำลอง | 21.9 นาที; 600 stitches/min + 1.2 s/jump + 12 s/color change |
| TRIM ที่สั่งโดยตรง | 0; การควบคุม Trim ยัง Not Available |
| การอนุมาน Trim ของ pyembroidery ค่าเริ่มต้น | 126; จาก Jump ต่อเนื่อง ไม่ใช่ผลตัดด้ายจากเครื่อง |

**Jump มากและฝีเข็มสั้นเหล่านี้เป็นข้อจำกัดที่ต้องปรับก่อนงานผลิต** ตัวเลขเป็นผลซอฟต์แวร์ ไม่ใช่เวลาที่วัดจากเครื่อง ไม่มี Tie-in/Tie-off อัตโนมัติหรือการจำลองแรงดึงผ้า ค่า 0 มม. เป็นคำสั่งลงเข็ม ณ จุดเริ่มแต่ละเส้น ไม่ใช่การล็อกด้าย

## การแยกโมดูลและ Vercel

แก้เฉพาะหน้า embroidery, assets/embroidery, embroidery engine/CLI/docs/tests, api/embroidery.py, Python requirements, config เฉพาะ Function นี้, workflow ทดสอบและ ignore สำหรับ cache ไม่เปลี่ยนเนื้อหา/route ของเว็บไซต์หลักหรือระบบ LIFE OS/LINE OA/ชำระเงิน/ฐานข้อมูล

กำหนด Python 3.12 ใน `.python-version` คง buildCommand และ outputDirectory เดิม เพิ่ม `includeFiles` สำหรับโมดูล Python และ maxDuration 30 วินาที ใช้ BaseHTTPRequestHandler entry point ตามเอกสาร Vercel Python Functions ทดสอบผ่าน Local HTTP server จริง แต่การ package dependency / cold start / timeout บน Vercel ยังไม่ยืนยัน

ตรวจ Vercel ด้วยเครื่องมือที่เชื่อมต่อแล้ว: ค้นโปรเจกต์ชื่อ chaylueklab, รายการในทีมที่เข้าถึงได้ และ Repo ID ไม่พบโปรเจกต์เดิม จึงไม่สร้างโปรเจกต์ใหม่ ไม่เปลี่ยนการตั้งค่า cloud และไม่ Deploy ไม่มีลิงก์ Preview ที่ยืนยันว่าเปิดได้

## หลักฐาน

- `reports/node-tests.txt`, `reports/python-tests.txt`, `reports/build.txt`
- `reports/browser-tests.txt`, `reports/browser-results.json`, `reports/browser-file-validation.json`
- `reports/chromium-desktop.png`, `reports/chromium-iphone.png`, `reports/webkit-iphone.png`
- `samples/synthetic-crest-50mm.dst`, `.threads.json`, `.report.json`

คำขอ/ไฟล์ที่ดาวน์โหลดระหว่าง browser regression เป็น temporary artifacts ที่สร้างซ้ำได้ ไม่ใส่ทุกไฟล์ซ้ำใน git มี SHA-256 / จำนวนฝีเข็มใน `browser-file-validation.json` และมี fixture DST ตัวอย่างถาวรใน samples

## สิ่งที่ยังไม่ยืนยันหรือยังไม่พร้อม

โลโก้โรงเรียนบ้านระหาร/อักษรไทย/ขอบจริงยังไม่ได้ทดสอบ เพราะยังไม่มีต้นฉบับ; ดู `SCHOOL-LOGO-TEST-PLAN.md` ไม่มีผลทดสอบจากเครื่อง Tajima, Windows/iPhone จริง หรือ Vercel cloud

ทุกชนิดฝีเข็มและ PES/JEF เป็น Experimental; Auto Satin, Text digitizing, Reshape raster objects, EMB และ Trim ยังไม่พร้อม ไม่มี authentication/สิทธิ์ owner จริง/คิวงานออนไลน์/การซิงค์หรือการรับเงินจริง Customer requests เก็บในเบราว์เซอร์และส่งต่อด้วย JSON เท่านั้น
