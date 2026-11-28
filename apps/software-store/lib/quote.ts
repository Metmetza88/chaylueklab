import {
  schoolPackageMaxBaht,
  schoolPackageMinBaht,
} from "@/lib/school-packages";

// Keep old saved plans readable; new quote requests offer school packages only.
export type QuotePlan = "files" | "service";

export const schoolPackageDescription =
  "ประเมินงานติดตั้ง ตั้งค่า อบรม และเอกสารประกอบตามขอบเขตที่ตกลง";

export const quoteFundingSources = [
  { value: "learner-development", label: "งบกิจกรรมพัฒนาผู้เรียน" },
  { value: "per-student-subsidy", label: "เงินอุดหนุนรายหัว" },
  { value: "school-revenue", label: "เงินรายได้สถานศึกษา" },
  { value: "other", label: "อื่น ๆ" },
  { value: "unknown", label: "ยังไม่ทราบ" },
] as const;
export type QuoteFundingSource = (typeof quoteFundingSources)[number]["value"];

export const quoteFundingLabel = (value: QuoteFundingSource) =>
  quoteFundingSources.find((source) => source.value === value)?.label ??
  "ยังไม่ทราบ";

export const quoteBudgets = [
  { value: "unknown", label: "ยังไม่ทราบ / ยังไม่กำหนด" },
  { value: "below-3500", label: "ต่ำกว่า 3,500 บาท" },
  { value: "3500-8900", label: "3,500–8,900 บาท" },
  { value: "8901-18000", label: "8,901–18,000 บาท" },
  { value: "18001-plus", label: "มากกว่า 18,000 บาท" },
] as const;
export type QuoteBudget = (typeof quoteBudgets)[number]["value"];

export const quoteBudgetLabel = (value: QuoteBudget) =>
  quoteBudgets.find((budget) => budget.value === value)?.label ??
  quoteBudgets[0].label;

export const serviceRange = {
  min: schoolPackageMinBaht * 100,
  max: schoolPackageMaxBaht * 100,
};

export const formatBaht = (cents: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100);

export function estimateRange(count: number) {
  if (!Number.isSafeInteger(count) || count < 1) return null;
  return {
    min: serviceRange.min * count,
    max: serviceRange.max * count,
  };
}

export function formatEstimate(count: number) {
  const range = estimateRange(count);
  if (!range) return "ยังไม่ได้เลือกโปรแกรม";
  const formatNumber = new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
  });
  return `${formatNumber.format(range.min / 100)}–${formatNumber.format(range.max / 100)} บาท`;
}
