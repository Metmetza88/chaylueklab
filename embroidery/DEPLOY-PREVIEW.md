# เปิด WORAMET เป็นเว็บทดลองแบบแยกจากเว็บไซต์หลัก

ใช้ Repository `Metmetza88/chaylueklab` และ Branch `feature/woramet-dojo-mvp-20261113` เดิม

ชุด Preview ประกอบด้วยหน้า Studio, assets/embroidery และ Python API ลายปักเท่านั้น ไม่รวมหน้า LIFE OS, LINE OA, การชำระเงินหรือฐานข้อมูล ไม่มีการสร้าง GitHub Repository หรือ Supabase Project ใหม่

## เตรียมชุดโค้ด

```bash
python embroidery/prepare_preview.py --output ../woramet-embroidery-preview --ref HEAD
cd ../woramet-embroidery-preview
node build.mjs
```

โปรแกรมอ่านไฟล์จาก Git commit ที่ระบุ ไม่ใช้ไฟล์ที่ยังไม่ได้ Commit ตรวจ SHA-256 ใน `deployment-plan.json` ได้ หน้า `/release.json` บนเว็บที่สร้างแล้วแสดง Repository, Branch และ Commit ส่วน API อยู่ที่ `/api/embroidery` ตัวเว็บเปิดได้ทั้ง `/` และ `/embroidery-studio.html`

โฟลเดอร์ปลายทางต้องอยู่นอก Repository เพื่อคงระบบ Build หลัก ชุด `_public` มีเฉพาะไฟล์หน้าเว็บ/รูป/JS/CSS และ release stamp ส่วน Python source อยู่นอก static output

## เป้าหมายที่อนุญาตสำหรับการทดลอง

- Team: `waramatw2546-4532` (`team_kA0EAug4JrrTT6ZIc54RXcmL`)
- Project เดิม: `chailueklab_ai_vercel_ready` (`prj_zz7DosOYL0IZ4XYN7INZm3vwpzla`)
- Environment: **preview**
- คง Git connection เดิม ไม่เปลี่ยน Branch หลักหรือ project settings ใช้การอัปโหลด source snapshot เฉพาะโมดูล และ local vercel.json สำหรับ deployment นี้

คำสั่ง Deploy ต้องระบุ Team, Project และ `--environment preview` ชัดเจน ห้ามใช้ `--prod`, Promote, Production domain หรือเปลี่ยนโปรเจกต์/ทีมโดยอัตโนมัติ

## สิทธิ์ Vercel

การเชื่อมแอป Vercel สำเร็จไม่ได้รับประกันสิทธิ์สร้างโปรเจกต์ หาก API ตอบ `403 forbidden` ให้ตรวจช่องทาง CLI ที่ใช้ข้อมูลเข้าบัญชีของตัวเองภายใต้ Team เดิม การเข้าสู่ระบบ CLI ต้องให้เจ้าของบัญชียืนยันที่หน้า Vercel ด้วยตนเอง ระบบไม่ขอให้ส่งรหัสผ่านหรือ token ในแชต

ตรวจ `vercel whoami --json --scope team_kA0EAug4JrrTT6ZIc54RXcmL --non-interactive` ก่อนสร้างโปรเจกต์ และตรวจโปรเจกต์ที่เลือกก่อน Deploy ถ้ายังไม่ยืนยันบัญชีหรือ Team ไม่ตรง ต้องคงสถานะรอ ห้ามถือว่าเวลาที่ผ่านไปคือการอนุมัติ

Preview อาจมี Vercel Authentication ตามค่าเริ่มต้น ให้ทดสอบผ่านช่องทางเข้าถึงที่ได้รับอนุญาตและแจ้งผู้ใช้ตามสถานะจริง

## ตรวจหลัง Deploy

1. ต้องได้สถานะ READY ใน Environment preview
2. เปิดหน้าเว็บและไฟล์ JS/CSS/ตัวอย่าง แล้วตรวจ release stamp ว่าตรง Commit
3. GET `/api/embroidery` ต้องรายงาน Engine พร้อมและ machine_test เป็น not_tested
4. POST ภาพตัวอย่างจริงเพื่อ Auto Digitize จากนั้นอ่าน DST ที่ได้รับกลับด้วย pyembroidery ตรวจจำนวนฝีเข็ม สี ขนาดและ END
5. ทดสอบหน้าเว็บในเบราว์เซอร์ขนาด Desktop และ iPhone รวมอัปโหลด/จำลอง/ดาวน์โหลด
6. บันทึกผลจริงเท่านั้น การ Deploy ผ่านไม่ใช่การยืนยันว่าใช้ผลิตกับเครื่อง Tajima ได้

## Preview ที่ตรวจผ่านแล้ว

URL: https://chailueklabaivercelready-nctmz3p4a-waramatw2546-4532.vercel.app

Source: `88829abb073e8d59b3ebfa488f17b8f00db44493` • Deployment: `dpl_717dN2ic54AFr5xPgkfLaj43owYX`

Vercel CLI กำหนดให้ deployment แรกของโปรเจกต์ใหม่เป็น Production จึงต้องใช้ Preview ของโปรเจกต์เดิมที่มี deployment อยู่แล้วและเชื่อมกับ Repository ตรงกัน ห้าม bootstrap ด้วย --prod หากยังไม่ได้รับอนุญาต Production โดยเฉพาะ โปรเจกต์ใหม่ `woramet-embroidery-preview` ที่สร้างระหว่างเตรียมงานยังว่างและไม่ได้รับ deployment

ตัวอย่างคำสั่งจากโฟลเดอร์ที่เตรียมแล้ว หลังตรวจตัวตนและเป้าหมาย:

```bash
vercel project inspect chailueklab_ai_vercel_ready --json --scope team_kA0EAug4JrrTT6ZIc54RXcmL --non-interactive
vercel deploy --project prj_zz7DosOYL0IZ4XYN7INZm3vwpzla --scope team_kA0EAug4JrrTT6ZIc54RXcmL --environment preview --non-interactive
```

Browser regression ของ protected preview ใช้ token จาก `vercel env run --project ...` ใน memory เท่านั้น ตั้ง header เฉพาะ origin ของ deployment และไม่บันทึก HAR/trace/header credential ตัวแปร `EMBROIDERY_REPORT_DIR` เลือกโฟลเดอร์รายงานแยกได้

เครื่องมือทดสอบ protected preview ตรวจเฉพาะ HTTP/HTTPS ของ origin เป้าหมาย ไม่ตาม redirect พร้อม credential และข้าม blob/data URL หากสภาพแวดล้อมต้องใช้ egress proxy ให้ตั้ง `EMBROIDERY_PROXY` สำหรับ Playwright context ข้อผิดพลาดถูกกรอง JWT ก่อนพิมพ์ log ผลตรวจ redirect ด้วย sentinel จำลองสอง origin อยู่ใน `reports/cloud-preview/header-redirect-check.json`
