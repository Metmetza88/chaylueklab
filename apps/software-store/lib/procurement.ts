export const seller = "ร้าน พ.สมนึก 2&3";
export const shopPhone = "084-323-2324";
export const shopPhoneLink = "tel:0843232324";
export const supplyLine = "https://lin.ee/8qkUbdt";
export const lineId = "@125cbuuu";
export const lineContact = "https://lin.ee/Vgg2m3N";
export const supplyCatalog = "https://psomnuek.chaylueklab.com/work?view=shop";
export const demoArea =
  "นัดสาธิตที่โรงเรียนใน อ.สตึก และพื้นที่อื่นใน จ.บุรีรัมย์ได้ โดยสอบถามวันและพื้นที่ให้บริการกับทีมงาน";
export const procurementPath = "/school-systems#procurement";
export const forms = [
  { slug: "quotation", name: "ตัวอย่างใบเสนอราคา" },
  { slug: "tor", name: "ตัวอย่างขอบเขตงาน (TOR)" },
  { slug: "approval-memo", name: "ตัวอย่างบันทึกข้อความขออนุมัติโครงการ" },
] as const;
export const lineDraft = (message: string) =>
  `https://line.me/R/oaMessage/%40125cbuuu/?${encodeURIComponent(message)}`;
export const documentDraft = lineDraft(
  "สวัสดีครับ/ค่ะ ขอชุดตัวอย่างเอกสารประกอบการจัดซื้อระบบโรงเรียน\nชื่อโรงเรียน: \nระบบที่สนใจ: \nเอกสารที่ต้องการ: ",
);
export const quoteDraft = (program: string) =>
  lineDraft(
    `สวัสดีครับ/ค่ะ ขอใบเสนอราคา ${program}\nชื่อโรงเรียน: \n${program.toLowerCase() === "met sport" ? "วันที่จัดงาน: \nจำนวนทีมและชนิดกีฬา: " : "จำนวนผู้ใช้: \nขอบเขตงานและกำหนดส่ง: "}`,
  );
