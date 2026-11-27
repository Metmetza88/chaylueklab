import Link from "next/link";
import { configured } from "@/lib/env";
import { QuoteBrief } from "@/components/MarketDialogs";
import { getProducts } from "@/lib/shop";
import { LINE, productTitle } from "@/lib/marketplace";

export default async function Page({searchParams}:{searchParams: Promise<{product?:string|string[]}>}) {
  const {product}=await searchParams;
  const requested=typeof product==="string" && /^[a-z0-9-]{1,60}$/.test(product)
    ? (await getProducts()).products.find(p=>p.slug===product)
    : undefined;
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
      <div className="panel stack">
        <a
          className="btn"
          href={LINE}
          target="_blank"
          rel="noopener noreferrer"
        >
          เปิด LINE Official Account ↗
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
      <QuoteBrief key={requested?.slug??"general"} product={requested?productTitle(requested.slug,requested.name):""}/>
    </section>
  );
}
