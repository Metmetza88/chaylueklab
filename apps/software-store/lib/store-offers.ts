const orderProducts = new Set([
  "met-sport",
  "met-attendance",
  "met-admission",
  "met-school-pro",
]);

export function storeOffer(slug: string, status: string) {
  if (status === "ready") {
    return {
      kind: "ready",
      label: "พร้อมใช้งาน",
      priceLabel: "ราคาตามแคตตาล็อก",
    } as const;
  }
  if (status === "coming_soon" && orderProducts.has(slug)) {
    return {
      kind: "order",
      label: "เปิดรับออเดอร์",
      priceLabel: "ประเมินตามขอบเขตงาน",
    } as const;
  }
  return {
    kind: "planned",
    label: "อยู่ในแผนพัฒนา",
    priceLabel: "ราคาเป้าหมาย",
  } as const;
}
