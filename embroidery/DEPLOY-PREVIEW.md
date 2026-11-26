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
- Project: `woramet-embroidery-preview`
- Environment: **preview**
- ไม่เชื่อม Git เพื่อป้องกันการ deploy Branch หลักอัตโนมัติ ใช้ source snapshot จาก Repository เดิม

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
