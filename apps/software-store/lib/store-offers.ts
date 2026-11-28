export function storeOffer(status: string) {
  if (status === "ready") {
    return {
      kind: "ready",
      label: "พร้อมใช้งาน",
      priceLabel: "ราคาตามแคตตาล็อก",
    } as const;
  }
  return {
    kind: "order",
    label: "เปิดรับออเดอร์ · พร้อมวางระบบ",
    priceLabel: "ประเมินตามขอบเขตงาน",
  } as const;
}
