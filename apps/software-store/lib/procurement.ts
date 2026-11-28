export const sellerName = "ร้าน พ.สมนึก 2&3";
export const sellerArea = "อ.สตึก จ.บุรีรัมย์";
export const trialLine = "https://line.me/R/ti/p/@125cbuuu";
export const sellerLine = "https://line.me/R/oaMessage/@125cbuuu/?";
export const servicePrice = { min: 350000, max: 590000 } as const;

export const budgetCategories: Record<string, string> = {
  เว็บไซต์และประชาสัมพันธ์: "เผยแพร่ข้อมูลและประชาสัมพันธ์",
  รับสมัครและทะเบียน: "ทะเบียนและงานรับสมัคร",
  วิชาการ: "วิชาการและการจัดการเรียนรู้",
  กิจกรรมและบริการ: "กิจกรรมและบริการนักเรียน",
  บริหารและธุรการ: "บริหารและธุรการ",
};

export const linkedDemos = [
  {
    name: "สร้างข้อสอบ",
    href: "https://education.chaylueklab.com/#/demo/exam-studio",
    description: "สร้างข้อสอบปรนัยและส่งออกใน Education 2570",
  },
  {
    name: "ทำเกียรติบัตร",
    href: "https://education.chaylueklab.com/#/demo/smart-certificate",
    description: "ปรับชื่อและรูปแบบเกียรติบัตรจากข้อมูลสมมติ",
  },
  {
    name: "จัดการแข่งขันกีฬาสี",
    href: "/demo/met-sport",
    description: "บันทึกคะแนนและดูตารางสรุปคณะสี",
  },
] as const;

export const hasLocalDemo = (slug: string) =>
  slug === "met-sport" ||
  ["met-school-pro", "met-attendance", "met-admission"].includes(slug);

export const displayStatus = (status: string, demo: boolean) =>
  status === "ready"
    ? "พร้อมติดตั้งใช้งาน"
    : demo
      ? "ทดลองใช้งานได้"
      : "ขอประเมินการติดตั้ง";

export const money = (cents: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100);

export const packageNames = {
  source: "ไฟล์ระบบติดตั้งเอง",
  service: "พร้อมติดตั้งและเอกสารจัดซื้อ",
};

export type PackageKind = keyof typeof packageNames;
export type QuoteProduct = {
  slug: string;
  name: string;
  price_cents: number;
  status: string;
};
export type QuoteSelection = Record<string, PackageKind>;

export function quoteTotals(
  items: { product: QuoteProduct; kind: PackageKind }[],
) {
  return items.reduce(
    ({ min, max, hasTarget }, { product, kind }) => ({
      min: min + (kind === "service" ? servicePrice.min : product.price_cents),
      max: max + (kind === "service" ? servicePrice.max : product.price_cents),
      hasTarget: hasTarget || (kind === "source" && product.status !== "ready"),
    }),
    { min: 0, max: 0, hasTarget: false },
  );
}
