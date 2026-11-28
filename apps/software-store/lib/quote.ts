export const schoolPackage = {
  label: "แพ็กเกจพร้อมใช้งานระดับโรงเรียน",
  price: "3,500–8,900 บาท",
  min: 350_000,
  max: 890_000,
  includes: [
    "ติดตั้งและตั้งค่าชื่อ โลโก้ และสีประจำโรงเรียน",
    "นำเข้าข้อมูลจากไฟล์ส่งออก DMC ที่โรงเรียนจัดเตรียม ตามขอบเขตงาน",
    "อบรมและดูแลตามระยะเวลาที่ระบุในใบเสนอราคา",
    "ใบเสนอราคา สเปก TOR ใบส่งมอบงาน และใบเสร็จรับเงินในนามร้าน พ.สมนึก 2&3",
  ],
};
export const schoolBudgetOptions = [
  "งบกิจกรรมพัฒนาผู้เรียน",
  "เงินอุดหนุนรายหัว",
  "เงินรายได้สถานศึกษา",
  "ให้ทีมงานช่วยแนะนำเอกสาร",
];
export const formatBaht = (cents: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100);
