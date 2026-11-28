export const schoolPackageSlugs = [
  "met-sport",
  "met-attendance",
  "met-admission",
  "met-school-pro",
] as const;

export const schoolPackageMinBaht = 3500;
export const schoolPackageMaxBaht = 8900;
export const schoolPackagePriceLabel = "3,500–8,900 บาท";
export const schoolPackageEstimate =
  "ประมาณการต่อระบบ ยืนยันราคาหลังสรุปขอบเขตงาน";

export function isSchoolPackage(slug: string): boolean {
  return schoolPackageSlugs.some((item) => item === slug);
}

export const schoolPackageDetails = [
  "ติดตั้งและตั้งค่าชื่อ โลโก้ และสีโรงเรียนตามระบบที่เลือก",
  "ช่วยนำเข้ารายชื่อนักเรียนจากไฟล์ DMC ที่รองรับ เฉพาะระบบที่ใช้รายชื่อนักเรียน",
  "อบรมผู้ดูแลระบบและช่วยเหลือตามระยะเวลาที่ระบุในใบเสนอราคา",
  "จัดชุดเอกสารตามขอบเขตงานในนาม ร้าน พ.สมนึก 2&3",
] as const;
