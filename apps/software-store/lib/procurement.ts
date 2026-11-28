import { formatEstimate } from "@/lib/quote";
import {
  isSchoolPackage,
  schoolPackagePriceLabel,
} from "@/lib/school-packages";

export const distributor = "ร้าน พ.สมนึก 2&3";
export const shopLocation = "ตลาดสดอำเภอสตึก จ.บุรีรัมย์";
export const lineId = "@125cbuuu";
export const localService =
  "พร้อมเข้าสาธิตระบบถึงโรงเรียนในพื้นที่ อ.สตึก และ จ.บุรีรัมย์";
export const shopPhone = { label: "084-3232324", href: "tel:0843232324" };
export const suppliesHref = "https://psomnuek.chaylueklab.com/work?view=shop";

// The URL is passed to LINE before the visitor sends a message. Keep only approved
// public labels and estimates in it; never pass contact fields or free-form text.
function lineMessage(message: string) {
  return (
    "https://line.me/R/oaMessage/" +
    encodeURIComponent(lineId) +
    "/?" +
    encodeURIComponent(message)
  );
}

const publicPackageNames: Readonly<Record<string, string>> = {
  "met-sport": "MET Sport",
  "met-attendance": "MET Attendance",
  "met-admission": "MET Admission",
  "met-school-pro": "MET School Pro",
};

export function quoteLineForPackages(slugs: readonly string[]) {
  const recognized = Array.from(
    new Set(
      slugs.filter(
        (slug) =>
          isSchoolPackage(slug) && Object.hasOwn(publicPackageNames, slug),
      ),
    ),
  );
  return lineMessage(
    [
      "ขอใบเสนอราคารวมสำหรับโรงเรียน",
      ...recognized.map(
        (slug, index) =>
          `${index + 1}. ${publicPackageNames[slug]} · ${schoolPackagePriceLabel} (ประมาณการ)`,
      ),
      recognized.length
        ? `ยอดประเมินเบื้องต้น: ${formatEstimate(recognized.length)} (ไม่ใช่ราคายืนยัน)`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export const storeInquiryLine = lineMessage(
  "สวัสดีครับ สนใจสอบถามแพ็กเกจระบบสำหรับโรงเรียนและขอใบเสนอราคาครับ",
);
export const helperLine = lineMessage(
  "สวัสดีครับ ขอคุยกับทีมงานเรื่องแพ็กเกจโรงเรียน ราคา และเอกสารประกอบการเบิกงบครับ",
);
export const procurementLine = lineMessage(
  "สวัสดีครับ ขอรับไฟล์ตัวอย่างเอกสารเบิกงบสำหรับโรงเรียนครับ",
);

export const procurementTemplates = [
  { slug: "quotation", name: "ตัวอย่างใบเสนอราคา" },
  { slug: "tor", name: "ตัวอย่างขอบเขตงาน (TOR) วิธีเฉพาะเจาะจง" },
  { slug: "approval-memo", name: "ตัวอย่างบันทึกข้อความขออนุมัติโครงการ" },
];
