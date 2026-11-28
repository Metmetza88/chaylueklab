import Link from "next/link";
import QuoteMessage from "@/components/QuoteMessage";
import { ContactDetails, StoreDialog } from "@/components/StoreDialogs";
import { lineContact, lineId } from "@/lib/marketplace";
import { catalogPrice, getProducts } from "@/lib/shop";
import { configured } from "@/lib/env";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string | string[];
    program?: string | string[];
  }>;
}) {
  const { product, program } = await searchParams;
  const selected =
    typeof product === "string"
      ? (await getProducts()).products.find((item) => item.slug === product)
      : undefined;
  const programName =
    selected?.name ??
    (typeof program === "string" ? program.trim().slice(0, 120) : "");
  return (
    <section className="prose">
      <span className="eyebrow">WORAMET AI LAB</span>
      <h1>ติดต่อเรา</h1>
      <p>
        ขอประเมินงาน ติดตั้งระบบ หรือสอบถามโปรแกรมโรงเรียนผ่าน LINE ของ
        CHAYLUEKLAB
      </p>
      <p>
        แจ้งชื่อโปรแกรมที่สนใจ จำนวนผู้ใช้งานโดยประมาณ
        และงานที่ต้องการให้ระบบช่วย
      </p>
      <ContactDetails />
      <div className="panel stack market-quotation" id="quotation">
        <h2>ขอใบเสนอราคา</h2>
        {programName && (
          <p>
            โปรแกรมที่สนใจ <strong>{programName}</strong>
          </p>
        )}
        <p>
          ระบุข้อมูลของโรงเรียน คัดลอกข้อความ แล้วเปิด LINE เพื่อส่งให้ทางร้าน
        </p>
        <QuoteMessage
          product={programName || undefined}
          price={selected && catalogPrice(selected).value}
        />
        <StoreDialog kind="procurement" className="btn ghost" />
        <a
          className="btn"
          href={lineContact}
          target="_blank"
          rel="noopener noreferrer"
        >
          เปิด LINE OA {lineId} ↗
        </a>
        <a
          href="https://chaylueklab.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          เว็บไซต์หลัก CHAYLUEKLAB ↗
        </a>
        {configured() && <Link href="/support">ส่งคำขอช่วยเหลือในระบบ</Link>}
      </div>
      <p className="muted">
        กรุณางดส่งรหัสผ่าน ข้อมูลบัตร หรือเอกสารของนักเรียนผ่านแชต
      </p>
    </section>
  );
}
