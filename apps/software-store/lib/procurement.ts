export const distributor = "ร้าน พ.สมนึก 2&3";
export const shopLocation = "ตลาดสดอำเภอสตึก จ.บุรีรัมย์";
export const lineId = "@125cbuuu";
export const localService =
  "พร้อมเข้าสาธิตระบบถึงโรงเรียนในพื้นที่ อ.สตึก และ จ.บุรีรัมย์";
export const shopPhone = { label: "084-3232324", href: "tel:0843232324" };
export const suppliesHref = "https://psomnuek.chaylueklab.com/work?view=shop";
export const lineMessage = (message: string) =>
  "https://line.me/R/oaMessage/" +
  encodeURIComponent(lineId) +
  "/?" +
  encodeURIComponent(message);
export const greetingLine = lineMessage(
  "สวัสดีครับ สนใจแพ็กเกจระบบโรงเรียน ขอรายละเอียดและนัดสาธิตครับ",
);
export const procurementLine = lineMessage(
  "สวัสดีครับ ขอรับไฟล์ตัวอย่างเอกสารเบิกงบสำหรับโรงเรียนครับ",
);

export const procurementTemplates = [
  { slug: "quotation", name: "ตัวอย่างใบเสนอราคา" },
  { slug: "tor", name: "ตัวอย่างขอบเขตงาน (TOR) วิธีเฉพาะเจาะจง" },
  { slug: "approval-memo", name: "ตัวอย่างบันทึกข้อความขออนุมัติโครงการ" },
  { slug: "delivery", name: "ตัวอย่างใบส่งมอบงาน" },
  { slug: "receipt", name: "ตัวอย่างใบเสร็จรับเงิน" },
];
