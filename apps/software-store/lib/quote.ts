export const packages = {
  files: {
    label: "ไฟล์ระบบติดตั้งเอง",
    description: "ติดตั้งตามคู่มือ ราคาประเมินจากแคตตาล็อกและรุ่นที่ส่งมอบ",
  },
  service: {
    label: "พร้อมติดตั้งและเอกสารเบิกงบ",
    description:
      "ติดตั้งพร้อมโลโก้ นำเข้าจากไฟล์ส่งออก DMC ที่โรงเรียนจัดเตรียม สอนใช้งาน พร้อมใบเสนอราคา TOR และใบเสร็จตามข้อตกลง",
  },
};
export type QuotePlan = keyof typeof packages;
export const serviceRange = {
  min: 350_000,
  max: 590_000,
  extendedMax: 990_000,
};
export const formatBaht = (cents: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100);
