import { bahtRange, getSchoolRate } from "@/lib/school-prices";

export { schoolQuotePrice } from "@/lib/school-prices";

export const schoolPackage = {
  label: "แพ็กเกจพร้อมใช้งานระดับโรงเรียน",
  includes: [
    "ติดตั้งและตั้งค่าชื่อ โลโก้ และสีประจำโรงเรียน",
    "นำเข้าข้อมูลจากไฟล์ส่งออก DMC ที่โรงเรียนจัดเตรียม ตามขอบเขตงาน",
    "อบรมและดูแลตามระยะเวลาที่ระบุในใบเสนอราคา",
    "ใบเสนอราคา สเปก TOR ใบส่งมอบงาน และใบเสร็จรับเงินในนามร้าน พ.สมนึก 2&3",
  ],
};

export function schoolQuoteTotal(slugs: readonly string[]) {
  const rates = slugs.flatMap((slug) => {
    const rate = getSchoolRate(slug);
    return rate ? [rate] : [];
  });
  const annual = rates.some(({ unit }) => unit === "ปี");
  const oneTime = rates.some(({ unit }) => unit !== "ปี");
  const min = rates.reduce((sum, rate) => sum + rate.min, 0);
  const max = rates.reduce((sum, rate) => sum + rate.max, 0);
  const pending = slugs.length - rates.length;
  return {
    label: annual
      ? oneTime
        ? "ยอดประเมินปีแรก"
        : "ยอดประเมินรายปี"
      : "ยอดประเมินรวม",
    amount: rates.length ? bahtRange(min, max) : null,
    pending: pending
      ? `${pending} รายการรอประเมินราคา${rates.length ? " (ยังไม่รวมในยอด)" : ""}`
      : "",
  };
}

export const schoolBudgetOptions = [
  "งบกิจกรรมพัฒนาผู้เรียน",
  "เงินอุดหนุนรายหัว",
  "เงินรายได้สถานศึกษา",
  "ให้ทีมงานช่วยแนะนำเอกสาร",
];
