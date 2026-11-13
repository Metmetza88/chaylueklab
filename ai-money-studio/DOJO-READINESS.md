# WORAMET AI LAB — เตรียม Dojo / NOT SUBMITTED

Repository: `Metmetza88/chaylueklab`
สาขาทดลอง: `feature/woramet-dojo-mvp-20261113`
แอป: `ai-money-studio/business-insights.html`

เอกสารนี้เป็นร่างเตรียมแข่งขัน ยังไม่ได้ส่งประกวดหรือเผยแพร่ Marketplace ไม่มีการ Merge หรือแก้ main เจ้าของอนุมัติลิงก์ทดลองสำหรับมือถือแล้วเมื่อ 13 พ.ย. 2026

## ข้อมูลที่ตรวจซ้ำวันที่ 13 พฤศจิกายน 2026

แหล่งข้อมูล: Dojo connector `search_hackathons` และ `get_hackathon`
ลิงก์ทางการ: <https://www.trydojo.io/hackathons/dojo-ai-hack>

- ชื่องาน: Dojo AI Hackathon; connector แสดงสถานะบัญชี **registered** การอ่านสถานะครั้งนี้ไม่ได้สมัครหรือแก้การลงทะเบียน
- เริ่ม 20 พ.ย. 2026 15:00 UTC = 22:00 เวลาไทย
- จบ 23 พ.ย. 2026 05:59 UTC = 12:59 เวลาไทย
- กำหนดลงทะเบียน 21 พ.ย. 2026 05:59:59 UTC = 12:59:59 เวลาไทย ทีม 1–4 คน รูปแบบ hybrid
- ข้อมูลรางวัลแสดง 2 Track รางวัลรวม USD 1,000 ไม่ใช่รายได้ที่รับประกัน
- คำอธิบายงานระบุว่างานที่ส่งจะเผยแพร่ใน Dojo Marketplace และผู้สร้างได้ 85% ของยอดขาย ต้องตรวจเงื่อนไขสิทธิ์ การขาย และการเผยแพร่ฉบับเต็มก่อนส่ง
- เครื่องมือที่อ่านยัง **ไม่ยืนยันชื่อ Track “Build for Business”** หรือกติกาการใช้โค้ดก่อนวันแข่งขัน ชื่อนี้เป็นเป้าหมายตามคำขอเจ้าของ ไม่ใช่คำยืนยันจากผู้จัด
- เอกสารเดิมระบุชื่อทีม WORAMET AI LAB แต่ผลเครื่องมือรอบนี้ยืนยันได้เฉพาะสถานะลงทะเบียน ต้องให้เจ้าของตรวจชื่อทีมในหน้า Dojo อีกครั้ง

## คำอธิบายโครงการ — Track Build for Business (ร่าง)

**ภาษาไทย**

WORAMET AI LAB — Business Insights ช่วยร้านค้าขนาดเล็กเปลี่ยนไฟล์ยอดขาย CSV ภาษาไทยหรืออังกฤษเป็นยอดรวม อันดับสินค้า และการเปรียบเทียบช่วงเวลาที่มีข้อมูลเพียงพอ เจ้าของร้านดาวน์โหลดรายงานและเริ่มร่างโพสต์จากชื่อสินค้าขายดีได้ โดยไม่ต้องอัปโหลดไฟล์หรือสมัครสมาชิก รุ่น MVP คำนวณยอดเงินแบบตรวจสอบได้และใช้เทมเพลตสำหรับข้อความ ยังไม่เชื่อม Generative AI โครงสร้างฝั่งเซิร์ฟเวอร์เตรียมไว้และปิดใช้งาน รออนุมัติผู้ให้บริการ งบประมาณ และการจัดการข้อมูลก่อนเชื่อมและทดสอบจริง

**English**

WORAMET AI LAB — Business Insights helps small stores turn Thai or English sales CSV into verifiable revenue totals, product rankings and period comparisons when the data supports them. Owners can download a report and prepare a template-based promotional draft without uploading files or signing up. The MVP uses deterministic money calculations and rules. Generative AI is not connected; a disabled server-side integration boundary is prepared for an owner-approved provider, privacy policy and budget. Its business value is making daily sales review and content preparation accessible from a compact web interface, without claiming profit or sales uplift.

**ผู้ใช้ / Problem / Value**

- ผู้ใช้: เจ้าของร้านที่มี CSV และต้องการสรุปเอง ไม่จำเป็นต้องเขียนสูตรตาราง
- ปัญหา: ตารางหลายแถวอ่านยาก ตัวเลขอาจผิดจาก CSV หรือทศนิยม และโพสต์สินค้าเริ่มเขียนลำบาก
- สิ่งที่สาธิตได้จริง: ไฟล์ → ตรวจข้อผิดพลาด → รวมยอดและจัดอันดับ → เปรียบเทียบช่วงที่ครบ → รายงานดาวน์โหลดและร่างโพสต์
- หลักฐานที่มี: Automated Tests และ Chromium 5 ขนาดหน้าจอ ไม่มีผลทดลองกับร้านค้าจริง ไม่มีตัวเลขเพิ่มรายได้หรือประหยัดเวลาที่วัดแล้ว
- AI disclosure: ใช้ AI ช่วยพัฒนาโค้ด แต่ฟังก์ชันที่ผู้ใช้กดใน MVP ยังไม่ใช่ Generative AI ต้องให้ผู้จัดยืนยันว่าขอบเขตนี้เหมาะกับ Track หรือจำเป็นต้องเพิ่ม model feature

## รายการที่เตรียมแล้ว

- [x] โค้ดอยู่ใน Repository และสาขาทดลองเดิม
- [x] README ไทยและอังกฤษ พร้อมวิธีรันและข้อจำกัด
- [x] CSV สมมติสองชุด ไม่มีข้อมูลร้าน/ลูกค้าจริง
- [x] คำนวณสตางค์ ตรวจ encoding/ข้อมูลผิดรูปแบบ และยกเลิกรายงานเก่า
- [x] รายงาน TXT/JSON และร่างโพสต์จากเทมเพลต
- [x] โครงสร้าง server AI ปิดไว้ พร้อมทดสอบ mock โดยไม่ใช้ API เสียเงิน
- [x] Automated Tests และผลตรวจ [AUDIT-QA.md](AUDIT-QA.md)
- [x] สคริปต์วิดีโอ 60–90 วินาที [DEMO-SCRIPT.md](DEMO-SCRIPT.md)

## รายการสิ่งที่ต้องส่งกรรมการ — รอแบบฟอร์มจริงยืนยัน

| รายการ | สิ่งที่มี / สิ่งที่ต้องทำ |
| --- | --- |
| ชื่อโครงการและชื่อทีม | WORAMET AI LAB — Business Insights; เจ้าของตรวจข้อมูลทีมใน Dojo |
| คำอธิบาย Problem / Solution / Track | ร่างไทยและอังกฤษด้านบน; ยืนยันชื่อ Track ทางการ |
| Source code และ Commit | ใช้เฉพาะสาขาทดลอง; แนบลิงก์ Commit ที่เจ้าของตรวจแล้ว |
| วิธีรัน / ข้อจำกัด / สถานะ AI | README สองภาษาและเอกสาร server |
| Working demo URL | [ลิงก์ทดลองโค้ดรุ่น 8e7ca1c](https://rawcdn.githack.com/Metmetza88/chaylueklab/8e7ca1c40d2196c748c0320abff640a0affa9bc7/ai-money-studio/business-insights.html) ผ่าน githack; ครั้งแรกกด Open the page; ยังต้องตรวจว่าผู้จัดยอมรับลิงก์บุคคลที่สามและการเผยแพร่ถาวร |
| วิดีโอ 60–90 วินาที | มีสคริปต์ ยังไม่บันทึกหรืออัปโหลด |
| ภาพประกอบหน้าจอ | มีหลักฐาน Chromium ข้อมูลสมมติใน `docs/woramet-qa/`; เจ้าของเลือกภาพส่ง |
| ผลทดสอบและชุดข้อมูล | AUDIT-QA.md, tests และ fixtures สมมติ |
| License / dependency / third-party rights | ต้องยืนยันสิทธิ์เผยแพร่โค้ดเดิมและภาพแบรนด์; ไม่กำหนด license ให้เจ้าของเอง |
| การใช้โค้ดก่อนแข่งขัน | ต้องรับคำยืนยันจากผู้จัดเป็นลายลักษณ์อักษร |
| การเปิด Marketplace | ต้องให้เจ้าของยอมรับเงื่อนไขเผยแพร่/ขายก่อนส่ง เพราะคำอธิบายงานระบุว่าเผยแพร่โดยอัตโนมัติ |

## สิ่งที่ต้องยืนยันก่อนส่ง (ยังไม่ทำแทนเจ้าของ)

- [ ] ผู้จัดอนุญาตใช้โปรเจกต์/โค้ด/ต้นแบบที่ทำก่อน 20 พ.ย. และกำหนดให้แยกส่วนที่ทำระหว่างแข่งอย่างไร
- [ ] เกณฑ์ตัดสิน ชื่อ Track ข้อกำหนดว่าต้องมี Generative AI จริงหรือไม่ รูปแบบและช่องส่งงาน
- [ ] สิทธิ์โค้ดเดิม/ภาพแบรนด์/ฟอนต์ และเงื่อนไข Marketplace; ตัวฟอนต์ใน Repository มีไฟล์ OFL เดิม
- [ ] ทดสอบ Safari บน iPhone และ Chrome/Edge บน Windows จริง รวม file picker, clipboard, ดาวน์โหลดและ VoiceOver/keyboard
- [ ] หากเพิ่ม AI จริง: เจ้าของอนุมัติผู้ให้บริการ งบ/โควตา ข้อมูลที่ส่ง การเก็บ Key ฝั่งเซิร์ฟเวอร์ และทดสอบด้วยข้อมูลสมมติก่อนกล่าวอ้าง
- [x] เจ้าของอนุมัติลิงก์ทดลองแยกจาก chaylueklab.com; ตรวจ remote Chromium และ assets ตรงกับ Commit เดิมแล้ว
- [ ] ทดสอบ Safari จริง และอนุมัติการโฮสต์ถาวร/ลิงก์ส่งประกวดที่ผู้จัดยอมรับ
- [ ] เจ้าของตรวจวิดีโอ Commit เอกสาร และอนุมัติส่งประกวด/เผยแพร่ครั้งสุดท้าย

เตรียมของที่ตรวจได้ให้ครบก่อนขออนุมัติ ไม่จำเป็นต้อง Merge เข้า main เพื่อส่งงานทดลอง ห้ามเปิด billing ส่งข้อมูลจริง หรือส่งประกวดจาก checklist นี้โดยอัตโนมัติ
