import { sellerName, sellerArea, trialLine } from "@/lib/procurement";

export default function SellerDetails() {
  const phone = process.env.SCHOOL_SELLER_PHONE?.trim();
  const registration = process.env.SCHOOL_SELLER_REGISTRATION?.trim();
  return (
    <address className="seller-details">
      <strong>ผู้จัดจำหน่ายและประสานเอกสารจัดซื้อ · {sellerName}</strong>
      <span>{sellerArea} · พัฒนาโดย WORAMET AI LAB</span>
      {phone && /^\+?[0-9 ()-]{8,24}$/.test(phone) && (
        <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`}>โทร {phone}</a>
      )}
      {registration && <span>ทะเบียนร้านค้า {registration}</span>}
      <a href={trialLine}>LINE OA @125cbuuu</a>
      <span>สอบถามเอกสารสำหรับการจัดซื้อวิธีเฉพาะเจาะจง</span>
    </address>
  );
}
