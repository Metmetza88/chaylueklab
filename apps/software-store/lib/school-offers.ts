import type { Product } from "@/lib/shop";

export const schoolOfferSlugs = [
  "met-sport",
  "met-attendance",
  "met-vote",
  "met-admission",
  "met-school-pro",
] as const;
export const voteOffer: Product = {
  id: "service-met-vote",
  slug: "met-vote",
  name: "MET Vote",
  tagline: "ระบบเลือกตั้งสภานักเรียนและสรุปคะแนนโหวต",
  description:
    "ทดลองลงคะแนนด้วยข้อมูลสมมติ แล้วขอประเมินระบบตามกติกาและรายชื่อผู้มีสิทธิ์ของโรงเรียน",
  category: "กิจกรรมและบริการ",
  price_cents: 0,
  status: "coming_soon",
  vip_free: false,
  kind: "service",
  latest_release_id: null,
  features: [
    "เลือกผู้สมัครและบันทึกคะแนน",
    "ดูผลคะแนนในกราฟ",
    "วางแผนสิทธิ์ลงคะแนนตามกติกาของโรงเรียน",
  ],
};

export function schoolOffers(products: Product[]) {
  return schoolOfferSlugs.flatMap((slug) => {
    const product = products.find((item) => item.slug === slug);
    if (product) return [product];
    return slug === voteOffer.slug ? [voteOffer] : [];
  });
}
