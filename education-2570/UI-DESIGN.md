# UI/UX

แบบ Figma: https://www.figma.com/design/RzDmHcof1KJA13U8dHKMiV
Desktop frame `2:13` (1440×1759), Mobile frame `2:69` (390×1318), source Software Card component `2:4`.

Figma เชื่อมต่อสำเร็จและไม่พบ design system เดิมจากการค้น card/button/color จึงสร้าง component และ Auto Layout สำหรับ Store ภาษาไทย. Read-back ยืนยัน Desktop 55 descendants, Mobile 20, font Noto Sans Thai, ไม่มี image-filled nodes ของ UI ที่ถูก flatten. Screenshot export ของ Desktop สำเร็จ แต่การตรวจภาพ Figma ใน session นี้ยังไม่ครบ จึงไม่อ้างว่า pixel-perfect กับโค้ด

เว็บจริงยึดสีขาว/ฟ้า #176ed0/กรมท่า #173b70, self-hosted Noto Sans Thai (400/600/700, Thai+Latin subsets, OFL), mobile menu, touch targets, visible keyboard focus, skip link, reduced-motion preference และ responsive grid

หน้าร้านมี hero อธิบายแพลตฟอร์ม, 14 categories, 3 demos จริง, ขั้นตอนขอใบเสนอราคา และบริการช่วยเหลือ. ภาพเป็น SVG แนวคิดที่จัดทำสำหรับโปรแกรม ไม่ใช่ screenshot อ้างว่าฟังก์ชัน Phase B–D พร้อมแล้ว

UI states: loading spinner/disabled submit, error+retry, no permission, not configured, no membership, no entitlement, empty search, draft not submitted, saved response with reference ID. ปุ่ม Demo มีเฉพาะโมดูลที่มีโค้ดสาธิตจริง

หลักฐาน Browser viewport อยู่ใน `evidence/home-Desktop-Chromium.png` และ `evidence/home-iPhone-WebKit.png` เมื่อรันทดสอบผ่าน. การจำลองไม่ได้แทนการทดสอบบน iPhone/Windows เครื่องจริง
