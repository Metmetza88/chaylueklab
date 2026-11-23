# WORAMET AI EMBROIDERY STUDIO — คู่มือภาษาไทย

รุ่น MVP Experimental บน Repository เดิม `Metmetza88/chaylueklab`, Branch `feature/woramet-dojo-mvp-20261113`

เว็บไซต์: `embroidery-studio.html` — ออกแบบ Workspace ใหม่ด้วยโค้ดของเราเอง ไม่ใช่ Wilcom และไม่ใช้โค้ด/SDK ของ Wilcom

**สร้างไฟล์ DST จริงและตรวจอ่านกลับได้ด้วยซอฟต์แวร์ แต่ยังไม่ผ่านการปักด้วยเครื่อง Tajima หรืออุปกรณ์จริง ไม่รับประกันคุณภาพงานผลิต**

## เปิดใช้งานบน Windows

ติดตั้ง Python 3.12 และ Node.js 24 จากนั้นเปิด PowerShell ในโฟลเดอร์ Repository:

```powershell
py -3.12 -m venv .venv-embroidery
.\.venv-embroidery\Scripts\python.exe -m pip install -r requirements.txt
node scripts/build-public-site.mjs
.\.venv-embroidery\Scripts\python.exe embroidery/serve.py --port 4175
```

เปิด `http://127.0.0.1:4175/embroidery-studio.html` ใน Edge, Chrome หรือ Safari ที่รองรับ JavaScript modules, Canvas, Pointer Events และ IndexedDB

Linux/macOS ใช้:

```bash
python3 -m venv /tmp/woramet-venv
/tmp/woramet-venv/bin/pip install -r requirements.txt
node scripts/build-public-site.mjs
/tmp/woramet-venv/bin/python embroidery/serve.py --port 4175
```

Local server เผยแพร่เฉพาะ `_site` และ API ลายปัก ไม่เปิดไฟล์ฐานข้อมูล, SQL, credentials หรือระบบหลัก ใช้เพื่อพัฒนาเท่านั้น ไม่ใช่ Production server

เปิดจาก iPhone บน Wi-Fi วงเดียวกันได้โดยเริ่ม server ด้วย `--host 0.0.0.0` แล้วใช้ IP ของคอมพิวเตอร์แทน 127.0.0.1 อนุญาต Firewall เฉพาะวงที่ไว้ใจได้ บน iPhone กด **เครื่องมือ** หรือ **ตั้งค่า** เพื่อเปิด/ปิดแผงด้านข้าง ส่วนการบันทึก/นำเข้า/ประวัติอยู่ใน File

ไม่สามารถสร้างลายใหม่บน GitHub Pages หรือการเปิด HTML แบบ `file://` เพราะไม่มี Python API ตัวอย่างที่บันทึกไว้เปิดดูได้เมื่อ serve แบบ HTTP ต้องรัน Local server หรือ Vercel Python Function ที่ตั้งค่าถูกต้องเพื่อแปลง/ตรวจ/ส่งออก

## ขั้นตอนออกแบบ

1. อัปโหลด JPG/PNG สูงสุด 2.5 MB และ 12 ล้านพิกเซล เลือกความกว้าง 10–120 มม. ความสูงจะรักษาสัดส่วนภาพและต้องไม่เกิน 120 มม. ค่าขนาดรวมขอบว่างของภาพด้วย ดู **ขอบเขตฝีเข็มจริง** ในแผงตั้งค่า
2. เลือก 1–15 สี ผ้าทอ/ผ้ายืด/หมวก และเปิด/ปิดตัดพื้นขาว ถ้าต้องการด้ายขาวต้องปิดตัดพื้นขาว ส่วนโปร่งใสจะไม่ปัก
3. เลือก Running หรือ Tatami รุ่นทดลอง ปรับ Stitch Length 0.5–8 มม., ระยะห่างแถว 0.3–1.2 มม. (เลขน้อย = แน่นขึ้น), Angle, Underlay และ Pull Compensation
4. กด **Auto Digitize** การสร้างใหม่นี้ใช้ภาพต้นฉบับและ **แทนที่การแก้วัตถุเดิม** เลิกทำได้ใน Owner Mode การเปลี่ยนค่าฝีเข็มในฟอร์มอย่างเดียวไม่ได้เปลี่ยนไฟล์เดิม
5. File → แบบว่างใหม่ ใช้เริ่มวาดโดยไม่ต้องมีภาพ Select: เลือก/ลากวัตถุ หรือเลือกใน Object Properties ปรับ Offset X/Y, สี, ชื่อ, การเปิดปัก และลำดับ ↑/↓ การเปิดปิดวัตถุจะเปลี่ยนทั้ง Preview และ Export
6. Running / Pen วาด polyline, Outline วาดเส้นปิด, Satin วาด **แนวกลาง** แล้วสร้าง zigzag ระหว่างรางสองด้าน, Tatami วาด polygon อย่างน้อย 3 จุด แตะ/คลิกวางจุดแล้วกด **จบเส้น** หรือ Enter / Esc ยกเลิก ทุกเครื่องมือสร้างลายเป็น Experimental
7. Satin กว้าง 0.5–6 มม. และไม่เกิน 90% ของ Stitch Length ที่เลือก เส้นโค้ง/มุมแหลมยังไม่ปรับปลายอัตโนมัติ Reshape ปรับเฉพาะจุดควบคุมวัตถุที่วาดเอง ไม่ปรับรูปทรงพื้นที่จากภาพอัตโนมัติ
8. ซูมด้วยปุ่มหรือวงล้อ เลือก Pan เพื่อลากมุมมอง ตารางและไม้บรรทัดมีหน่วย mm ปุ่ม 1:1 ใช้ CSS 96 dpi เป็นค่าเริ่ม **ต้องสอบเทียบด้วยไม้บรรทัดจริง** ก่อนอ้างขนาดจริงบนจอ
9. กดจำลอง ดูลำดับปัก ปรับความเร็วและแถบเวลา เปิด Jump เพื่อตรวจเส้นเดินด้าย Preview ใช้คำสั่งที่อ่านกลับจาก **DST ที่เข้ารหัสจริง** ไม่ใช่ภาพสีที่ตั้งชื่อว่า stitch preview
10. Export → DST, PES, JEF, SVG หรือ PNG จากนั้นดาวน์โหลดลำดับสีแยกจากปุ่ม **ลำดับสี** DST ไม่เก็บสีด้ายจริงอย่างน่าเชื่อถือ บางเบราว์เซอร์อาจบล็อกการดาวน์โหลดหลายไฟล์พร้อมกัน ให้กดลำดับสีแยกอีกครั้งได้

Tatami ที่ใช้เป็น angled clipped fill แบบสลับ phase จุดลงเข็ม 4 แถว รองรับรูเจาะและเชื่อมแถวเฉพาะเมื่อแนวเชื่อมอยู่ใน mask มีการลดจุด contour ถี่และแบ่งฝีเข็มยาว ยังมี Jump และฝีเข็มสั้นที่ต้องตรวจ ไม่ใช่ระบบ digitizing คุณภาพผลิตอัตโนมัติ

ผ้าทอ/ผ้ายืด/หมวกบันทึกเป็นข้อมูลประกอบ ไม่ได้จำลองแรงดึงผ้าหรือปรับความตึงอัตโนมัติ Underlay เป็นขอบ inset และ sparse fill ไม่ใช่การเลือก underlay เฉพาะผ้าอัตโนมัติ Pull Compensation เป็น mask dilation ความละเอียด 0.125 มม. ไม่มี Tie-in/Tie-off อัตโนมัติ จุดลงเข็มเริ่มเส้นไม่ใช่การล็อกด้าย

## Owner Mode / Customer Mode

Owner: ออกแบบ แก้ไข บันทึก/เปิดไฟล์ ดูประวัติ เปลี่ยนสถานะคำขอในเครื่อง และส่งออก

Customer: อัปโหลด ตั้งขนาด/สี สร้าง Preview และบันทึกคำขอเป็น Local Draft พร้อมดาวน์โหลด `.request.json` เพื่อส่งให้ร้านด้วยตนเอง

**ไม่มีการส่งคำขอถึงร้านผ่านเซิร์ฟเวอร์ ไม่มีระบบบัญชี การแยกสิทธิ์จริง การซิงค์หลายเครื่อง หรือการชำระเงินจริง** การสลับโหมดเป็น UX เท่านั้น API ไม่มี owner authentication และไม่เก็บข้อมูลส่วนตัวที่เซิร์ฟเวอร์ ก่อนเปิดบริการสาธารณะต้องเพิ่ม authentication, owner authorization, durable queue/storage, rate limiting และ privacy controls

ร้านนำเข้าไฟล์คำขอจาก File → เปิดไฟล์แบบ/คำขอ แล้วเปลี่ยนสถานะ Local Draft → กำลังตรวจ → พร้อมให้ลูกค้าตรวจในประวัติ จากนั้นดาวน์โหลด JSON ส่งสถานะกลับเอง สถานะไม่ใช่การรับรองว่าปักผ่านแล้ว

งานเก็บใน IndexedDB เฉพาะเบราว์เซอร์นี้ ล้าง browser data/Private Mode หรือเปลี่ยนเครื่องอาจทำให้งานหาย **ดาวน์โหลดไฟล์แบบ JSON เพื่อสำรอง** ไม่เก็บ API keys หรือข้อมูลบัตรใด ๆ ดูโครงสร้างเตรียมต่อระบบใน `contracts.json`

## สถานะฟีเจอร์

| ฟีเจอร์ | สถานะ / ข้อจำกัด |
| --- | --- |
| Running, manual centerline Satin, Tatami, Underlay, Pull Compensation | Experimental |
| การแยกสี 1–15, จัดวัตถุ/สี, long-stitch splitting, row connection | ใช้งานในซอฟต์แวร์ได้ ต้องตรวจคุณภาพด้วยคน |
| Stitch simulation, DST | ผ่าน automated software round-trip tests |
| PES / JEF | Experimental; เขียนและอ่านกลับด้วย pyembroidery ยังไม่ลองเครื่อง |
| SVG stitch paths / PNG Preview | ใช้งานได้; ไม่ใช่ EMB |
| Auto Satin จากภาพ / Text digitizing / EMB / DST Trim | Not Available |
| Reshape raster objects | Not Available; ใช้ได้เฉพาะจุดควบคุมวาดเอง |
| บัญชีผู้ใช้ / ระบบคำขอออนไลน์ / ชำระเงิน | Not Available; มีเพียงโครงสร้างและ Local Draft |
| โลโก้โรงเรียนบ้านระหาร / ปัก Tajima จริง / อุปกรณ์ Windows-iPhone จริง | ยังไม่ได้ทดสอบ |

## CLI และตัวอย่างไฟล์

```powershell
.\.venv-embroidery\Scripts\python.exe embroidery/convert.py logo.png --output sample.dst --width-mm 50 --colors 3 --row-mm 0.45 --stitch-length 2.8 --angle 30
```

ใช้ Engine เดียวกับ API ไม่ใช่การเปลี่ยนนามสกุล PNG เขียน `.dst`, `.threads.json`, `.woramet.json`, `.report.json` คู่กัน รองรับ `--output sample.pes` / `sample.jef` แต่ปฏิเสธ `.emb` ใช้ `--type running`, `--keep-white`, `--no-underlay`, `--pull 0.15`, `--fabric woven|knit|cap` ได้

ตัวอย่างต้นฉบับ/ไฟล์ DST/ลำดับสี/ผลตรวจอยู่ใน `samples/` สร้างซ้ำด้วย `python embroidery/make_samples.py` เป็นตราสังเคราะห์เรขาคณิตของเราเอง ไม่ใช่ตราโรงเรียน

## การทดสอบ

```powershell
.\.venv-embroidery\Scripts\python.exe -m unittest discover -s embroidery/tests -v
node --test tests/*.test.mjs
node scripts/build-public-site.mjs
```

Browser regression (ติดตั้งในสภาพแวดล้อมพัฒนา ไม่ต้องเปลี่ยน package ของเว็บไซต์หลัก):

```bash
npm install --no-save --package-lock=false playwright@1.64.1
npx playwright install --with-deps chromium webkit
# เปิด local server ในอีก terminal ก่อน
node embroidery/check-browser.mjs
```

ตัวแปร `EMBROIDERY_URL` เปลี่ยน base URL, `CHROMIUM_PATH` ใช้ Chromium ที่ติดตั้งไว้, `PLAYWRIGHT_MODULE` ใช้ path ไปที่ Playwright index.mjs จากภายนอก Repo ได้ รายงานและ screenshots อยู่ใน `reports/` มี Workflow แยก `embroidery-tests.yml` ทดสอบ Python บน Linux/Windows โดยไม่ deploy

## Vercel และขอบเขตการเปลี่ยนแปลง

กำหนด Python 3.12 ใน `.python-version` เพื่อให้ตรงกับ wheels ที่ทดสอบ คง buildCommand และ outputDirectory เดิมใน `vercel.json` เพิ่มเพียง config สำหรับ `api/embroidery.py` เพื่อ bundle `embroidery/` และจำกัดเวลา 30 วินาที รูปแบบ handler เป็น `BaseHTTPRequestHandler` ตาม Vercel Python Functions และใช้ requirements.txt ที่ root; Python ใช้งานได้จริงใน Local HTTP tests แต่ **ยังไม่ได้ยืนยัน Vercel cloud build/runtime** ต้องตรวจ Python version, function bundle size, dependencies และ timeout บนโปรเจกต์เดิม

request จำกัด 3.6 MB, ภาพ 2.5 MB, response 4 MB, แบบ 100 วัตถุ/100,000 จุด และ 50,000 ฝีเข็ม ความละเอียด mask 8 px/mm บางภาพซับซ้อนต้องลดสี/ขนาด ห้ามใช้ Local server เป็น public production API

บัญชี Vercel ที่เชื่อมต่อระหว่างงานนี้ไม่แสดงโปรเจกต์เดิม จึง **ไม่ได้ Deploy Preview หรือ Production และไม่ได้สร้างโปรเจกต์ใหม่** ไม่แก้ LIFE OS, LINE OA, ชำระเงิน, ฐานข้อมูล หรือหน้าเว็บไซต์หลัก

อ่านผลทดสอบจริงและสิ่งที่ยังไม่ยืนยันใน `TEST-REPORT.md` และใบอนุญาตใน `LICENSES.md`

หลัง Browser regression ใช้ `python embroidery/validate_browser_files.py` เพื่อตรวจ DST/PES/JEF ที่ดาวน์โหลดผ่านหน้าเว็บจริงและ PNG ที่ไม่ใช่ภาพว่าง แผนการทดสอบโรงเรียนที่ยังรอต้นฉบับอยู่ใน `SCHOOL-LOGO-TEST-PLAN.md`

DST ไม่มี opcode ตัดด้ายที่ตีความเหมือนกันทุกเครื่อง: Simulation อ่านคำสั่ง literal โดยปิดการอนุมาน TRIM ของ reader แล้วรายงาน `inferred_trim_count` แยกตามค่าเริ่มต้นของ pyembroidery (3 jumps) ค่า `trim_count` เป็น null เพราะยังรับรองพฤติกรรมบนเครื่องไม่ได้ ไม่ใช่ศูนย์การตัดด้ายที่รับประกัน
