# วิดีโอสาธิต WORAMET AI LAB — 80 วินาที (ร่าง)

ยังไม่บันทึกหรือเผยแพร่วิดีโอ ใช้เฉพาะข้อมูลสมมติ ปิดหน้าต่าง/แจ้งเตือนที่มีข้อมูลส่วนตัวก่อนอัด ไม่โชว์ Terminal ที่มี Key หรือบัญชีจริง

เปิด local preview ตาม README และเตรียมไฟล์ `fixtures/thai-sales-14-days.csv` ไว้ ไม่ต้องเรียก AI API

| เวลา | สิ่งที่แสดง | บทพูดภาษาไทย |
| --- | --- | --- |
| 0–10 วินาที | หน้าแรกและชื่อ WORAMET AI LAB | “ร้านเล็กอาจมีไฟล์ยอดขาย แต่ยังไม่รู้ว่าจะเริ่มดูตรงไหน WORAMET AI LAB ช่วยเปลี่ยน CSV ให้เป็นภาพรวมร้าน และเตรียมข้อความโปรโมตได้ในหน้าเดียว” |
| 10–22 วินาที | กด “ดูผลด้วยข้อมูลสมมติ” ชี้ยอดและจำนวน | “กดทดลองด้วยข้อมูลสมมติ ชุดนี้มียอดขาย 7,200 บาท ขายได้ 12 ชิ้น จาก 7 แถวข้อมูล ตัวเลขนี้เป็นยอดขาย ไม่ใช่กำไร” |
| 22–35 วินาที | อันดับสินค้าและข้อสังเกต | “ดูว่าสินค้าไหนทำยอดขายสูงสุด และสินค้าไหนขายได้มากสุดตามจำนวน ระบบคำนวณด้วยสูตรที่ตรวจสอบได้ ไม่สร้างข้อมูลที่ไม่มีในไฟล์” |
| 35–51 วินาที | เลือก CSV ไทย 14 วัน แล้วกดวิเคราะห์ | “นำเข้า CSV ภาษาไทยชุดใหม่ ผลเก่าจะถูกซ่อน ชุดสมมตินี้มียอด 2,100 บาท และเพิ่ม 100% เมื่อเทียบสองช่วง 7 วัน ถ้าวันไม่ครบ ระบบจะบอกว่าข้อมูลยังไม่พอ” |
| 51–65 วินาที | ดาวน์โหลด TXT แล้วเลื่อนดูร่างโพสต์ | “ดาวน์โหลดรายงานไปวางแผนต่อ และเริ่มร่างโพสต์จากชื่อสินค้าขายดีได้ ข้อความเป็นเทมเพลต ต้องตรวจข้อมูลและสต็อกก่อนโพสต์จริง” |
| 65–80 วินาที | ป้ายสถานะสูตร/เทมเพลตและความเป็นส่วนตัว | “ไฟล์ถูกประมวลผลในเบราว์เซอร์ ไม่มีค่า API รุ่นนี้ยังไม่เชื่อม Generative AI เราเตรียมทางเชื่อมฝั่งเซิร์ฟเวอร์ไว้และปิดอยู่ เพื่อทดสอบอย่างปลอดภัยหลังเจ้าของอนุมัติ” |

จังหวะพูดจริงอาจทำให้เวลาแตกต่าง ใช้นาฬิกาจับเวลาแล้วปรับให้อยู่ 60–90 วินาที หากต้องตัด ให้ย่อบทเปิดและช่วงอันดับสินค้า อย่าตัดข้อความเปิดเผยสถานะ AI

## English narration alternative (~80–90 seconds)

“Small stores often have sales spreadsheets but struggle to turn them into a clear next step. WORAMET AI LAB brings sales review and content preparation into one browser interface.

Let's try fictional data. This sample has 7,200 baht in revenue, 12 units and seven product rows. Revenue is not profit.

The report ranks products by revenue and identifies the unit leader separately. The totals come from verifiable calculations, not invented facts.

Now we import a Thai CSV. The old report disappears immediately. This fictional fourteen-day dataset totals 2,100 baht. The latest seven days are up one hundred percent compared with the previous seven. Missing days mean the comparison is unavailable, rather than assumed to be zero.

Download the report and use the template draft as a starting point for a product post. Review all details and stock before publishing.

Files are processed locally in the browser, with no API fees. Generative AI is not connected in this MVP. A disabled server integration boundary is prepared for an approved provider, budget and privacy review.”

## ก่อนอัดและก่อนส่ง

- ใช้คำว่า “ข้อมูลสมมติ”, “สูตรและเทมเพลต” และ “ยังไม่เชื่อม Generative AI” ตามสถานะจริง
- ไม่อ้างว่ายอดเพิ่มขึ้น 100% เกิดจากแอป ตัวเลขนี้เป็นเพียงการเปรียบเทียบใน CSV สมมติ
- หน้าจอขนาด iPhone ในเครื่องทดสอบเป็นการจำลอง ยังไม่ใช่หลักฐาน Safari บน iPhone จริง
- คำบรรยายภาษาอังกฤษในภาพแบรนด์เป็นแนวทางแบรนด์ ไม่ใช่หลักฐานว่า model feature ทำงานแล้ว
- ให้เจ้าของอนุมัติไฟล์วิดีโอ ลิงก์ทดลอง การใช้ภาพแบรนด์ และการส่ง Dojo/Marketplace ก่อนอัปโหลด
