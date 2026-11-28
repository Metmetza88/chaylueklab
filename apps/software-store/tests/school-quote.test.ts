import { describe, expect, it } from "vitest";
import {
  helperLine,
  procurementLine,
  quoteLineForPackages,
  storeInquiryLine,
} from "@/lib/procurement";
import { estimateRange, formatEstimate, quoteBudgetLabel } from "@/lib/quote";
import { schoolPackageSlugs } from "@/lib/school-packages";

function prefill(url: string) {
  const destination = new URL(url);
  expect(destination.origin).toBe("https://line.me");
  expect(destination.pathname).toBe("/R/oaMessage/%40125cbuuu/");
  return decodeURIComponent(destination.search.slice(1));
}

describe("school estimate and LINE handoff", () => {
  it("estimates a nonbinding range per system and adds only selected systems", () => {
    expect(formatEstimate(1)).toBe("3,500–8,900 บาท");
    expect(formatEstimate(3)).toBe("10,500–26,700 บาท");
    expect(estimateRange(0)).toBeNull();
    expect(estimateRange(1.5)).toBeNull();
    expect(quoteBudgetLabel("unknown")).toBe("ยังไม่ทราบ / ยังไม่กำหนด");
  });

  it("uses the official OA and excludes unpublished or free-form slugs before building the URL", () => {
    const message = prefill(
      quoteLineForPackages([
        "met-sport",
        "met-sport",
        "met-attendance",
        "met-certificate",
        "โรงเรียน ตัวอย่าง 0840000000",
      ]),
    );
    expect(message).toContain("1. MET Sport");
    expect(message).toContain("2. MET Attendance");
    expect(message).toContain("7,000–17,800 บาท (ไม่ใช่ราคายืนยัน)");
    expect(message).not.toContain("0840000000");
    expect(message).not.toContain("โรงเรียน ตัวอย่าง");
    expect(message).not.toContain("met-certificate");
    expect(message.match(/MET Sport/g)).toHaveLength(1);
    expect(prefill(quoteLineForPackages(schoolPackageSlugs))).toContain(
      "14,000–35,600 บาท",
    );
  });

  it("keeps independent fixed greetings for procurement, general and helper links", () => {
    expect(prefill(procurementLine)).toContain("ขอรับไฟล์ตัวอย่างเอกสารเบิกงบ");
    expect(prefill(storeInquiryLine)).toContain(
      "สอบถามแพ็กเกจระบบสำหรับโรงเรียน",
    );
    expect(prefill(helperLine)).toContain("ขอคุยกับทีมงาน");
  });
});
