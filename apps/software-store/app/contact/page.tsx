import Link from "next/link";
import QuoteCart from "@/components/QuoteCart";
import QuoteMessage from "@/components/QuoteMessage";
import {
  greetingLine,
  lineId,
  lineMessage,
  localService,
  shopPhone,
} from "@/lib/procurement";
import { StoreDialogButton } from "@/components/StoreDialogs";
import { getProducts } from "@/lib/shop";
import { voteOffer } from "@/lib/school-offers";
import SchoolPackage from "@/components/SchoolPackage";
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
  const { products: catalog } = await getProducts();
  const products = catalog.some(({ slug }) => slug === voteOffer.slug)
    ? catalog
    : [...catalog, voteOffer];
  const selected =
    typeof product === "string"
      ? products.find((item) => item.slug === product)
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
      <p>
        {localService} · <a href={shopPhone.href}>โทร {shopPhone.label}</a>
      </p>
      <div className="panel stack market-quotation" id="quotation">
        <h2>ขอใบเสนอราคา</h2>
        {programName && (
          <p>
            โปรแกรมที่สนใจ <strong>{programName}</strong>
          </p>
        )}
        <p>กรอกข้อมูลโรงเรียน ตรวจข้อความ แล้วคัดลอกไปวางในแชท LINE ของร้าน</p>
        <SchoolPackage slug={selected?.slug} />
        <QuoteCart
          catalog={products.map(({ slug, name }) => ({ slug, name }))}
          selectedSlug={selected?.slug}
        />
        <details open={programName ? true : undefined}>
          <summary>ขอใบเสนอราคาระบบเดียว</summary>
          <QuoteMessage product={programName || undefined} />
        </details>
        <StoreDialogButton name="procurement" className="btn ghost">
          เอกสารเบิกงบ
        </StoreDialogButton>
        <a
          className="btn"
          href={
            selected
              ? lineMessage(
                  `สวัสดีครับ ขอใบเสนอราคา ${selected.name} และเอกสารเบิกงบครับ`,
                )
              : greetingLine
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          เปิด LINE OA {lineId}
        </a>
        {configured() && <Link href="/support">ส่งคำขอช่วยเหลือในระบบ</Link>}
      </div>
      <p className="muted">
        กรุณางดส่งรหัสผ่าน ข้อมูลบัตร หรือเอกสารของนักเรียนผ่านแชต
      </p>
    </section>
  );
}
