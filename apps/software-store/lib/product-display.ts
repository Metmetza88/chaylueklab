import { productDemos } from "./product-demos";

const conceptSlugs = new Set([
  "met-student",
  "met-schedule",
  "met-grades",
  "met-assignment",
  "met-certificate",
  "met-sport",
  "met-inventory",
  "met-e-office",
  "met-library",
  "met-parent",
  "met-school-shop",
  "met-exam-ai",
]);
export function productConcept(slug: string) {
  return conceptSlugs.has(slug) ? `/art/concepts/${slug}.svg` : null;
}
export function productDisplay(slug: string, status: string) {
  if (status === "ready") return { label: "พร้อมจำหน่าย", tone: "ready" };
  const demo = productDemos.find((entry) => entry.slug === slug);
  if (demo) {
    return {
      label:
        demo.stage === "release_candidate"
          ? "ทดลองเดโมได้ · รุ่นทดสอบ"
          : "ทดลองเดโมได้",
      tone: "demo",
    };
  }
  if (slug === "met-sport") {
    return { label: "สอบถามงานตามสเปกได้", tone: "demo" };
  }
  return { label: "อยู่ในแผนพัฒนา", tone: "" };
}
