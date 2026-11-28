export const schoolPackage = {
  label: "แพ็กเกจพร้อมใช้งานระดับโรงเรียน",
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

const quoteUnits = ["งาน", "ปี", "ครั้ง"] as const;
type QuoteUnit = (typeof quoteUnits)[number];
type QuoteRange = { min: number; max: number; unit: QuoteUnit };

// Prices in satang. Only list products with an explicitly supplied price.
const ranges = new Map<string, QuoteRange>([
  ["met-sport", { min: 390_000, max: 650_000, unit: "งาน" }],
  ["met-attendance", { min: 490_000, max: 990_000, unit: "ปี" }],
  ["met-vote", { min: 290_000, max: 450_000, unit: "ครั้ง" }],
]);

const rangeLabel = ({ min, max, unit }: QuoteRange) =>
  `${formatBaht(min)}–${formatBaht(max)} / ${unit}`;

export function schoolQuotePrice(slug: string) {
  const range = ranges.get(slug);
  return range ? rangeLabel(range) : "ขอใบเสนอราคาตามขอบเขตงาน";
}

export function summarizeSchoolQuote(slugs: ReadonlyArray<string>) {
  const totals = new Map<QuoteUnit, QuoteRange>();
  let unpriced = 0;
  for (const slug of new Set(slugs)) {
    const range = ranges.get(slug);
    if (!range) {
      unpriced++;
      continue;
    }
    const total = totals.get(range.unit);
    totals.set(
      range.unit,
      total
        ? {
            unit: range.unit,
            min: total.min + range.min,
            max: total.max + range.max,
          }
        : { ...range },
    );
  }
  return {
    groups: quoteUnits.flatMap((unit) => {
      const total = totals.get(unit);
      return total ? [{ unit, label: rangeLabel(total) }] : [];
    }),
    unpriced,
  };
}
