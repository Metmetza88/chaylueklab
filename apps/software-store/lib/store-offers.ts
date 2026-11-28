export function storeOffer(status: string) {
  if (status === "ready") {
    return {
      kind: "ready",
      label: "พร้อมใช้งาน",
    } as const;
  }
  return {
    kind: "order",
    label: "เปิดรับออเดอร์ · พร้อมวางระบบ",
  } as const;
}
