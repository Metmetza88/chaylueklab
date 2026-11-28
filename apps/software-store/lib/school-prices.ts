type SchoolRate = { min: number; max: number; unit: "งาน" | "ปี" | "ครั้ง" };

const schoolRates = new Map<string, SchoolRate>([
  ["met-sport", { min: 3_900, max: 6_500, unit: "งาน" }],
  ["met-attendance", { min: 4_900, max: 9_900, unit: "ปี" }],
  ["met-vote", { min: 2_900, max: 4_500, unit: "ครั้ง" }],
  ["met-inventory", { min: 3_500, max: 3_500, unit: "ปี" }],
]);
const numberFormat = new Intl.NumberFormat("th-TH");

export function getSchoolRate(slug: string) {
  return schoolRates.get(slug);
}

export function bahtRange(min: number, max: number) {
  const start = numberFormat.format(min);
  return min === max
    ? `${start} บาท`
    : `${start}–${numberFormat.format(max)} บาท`;
}

export function schoolQuotePrice(slug: string) {
  const rate = getSchoolRate(slug);
  return rate
    ? `${bahtRange(rate.min, rate.max)} / ${rate.unit}`
    : "ขอประเมินราคา";
}
