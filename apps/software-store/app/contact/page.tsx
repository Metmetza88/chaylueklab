import Link from "next/link";
import QuoteCart from "@/components/QuoteCart";
import QuoteMessage from "@/components/QuoteMessage";
import { lineContact } from "@/lib/marketplace";
import {
  lineId,
  localService,
  shopPhone,
  storeInquiryLine,
} from "@/lib/procurement";
import { StoreDialogButton } from "@/components/StoreDialogs";
import { getProducts } from "@/lib/shop";
import { configured } from "@/lib/env";
import {
  sportsBundleDraft,
  sportsBundleName,
  sportsBundleSlug,
} from "@/lib/sports-bundle";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string | string[];
    program?: string | string[];
    bundle?: string | string[];
  }>;
}) {
  const { product, program, bundle } = await searchParams;
  const { products } = await getProducts();
  const selected =
    typeof product === "string"
      ? products.find((item) => item.slug === product)
      : undefined;
  const customProgram =
    typeof program === "string" ? program.trim().slice(0, 120) : "";
  const bundleQuote =
    bundle === sportsBundleSlug ||
    (!selected && customProgram === sportsBundleName);
  const programName = bundleQuote
    ? sportsBundleName
    : (selected?.name ?? customProgram);
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
        {localService} ·{" "}
        <a href={shopPhone.href}>โทรสอบถามร้าน {shopPhone.label}</a>
      </p>
      <div className="panel stack market-quotation" id="quotation">
        <h2>ขอใบเสนอราคา</h2>
        {programName && (
          <p>
            {bundleQuote ? "รายการที่สนใจ" : "โปรแกรมที่สนใจ"}{" "}
            <strong>{programName}</strong>
          </p>
        )}
        <p>
          ระบุข้อมูลของโรงเรียน คัดลอกข้อความ แล้วเปิด LINE เพื่อส่งให้ทางร้าน
        </p>
        {bundleQuote && (
          <p>
            ทางร้านจะยืนยันรายการอุปกรณ์ สต๊อก
            และราคาตามขอบเขตงานก่อนออกใบเสนอราคา
          </p>
        )}
        {bundleQuote && <QuoteMessage draft={sportsBundleDraft} />}
        <QuoteCart
          catalog={products.map(({ slug, name }) => ({ slug, name }))}
          suggestedProduct={
            selected ? { slug: selected.slug, name: selected.name } : undefined
          }
        />
        {!bundleQuote && (
          <details open={programName ? true : undefined}>
            <summary>ขอใบเสนอราคาระบบเดียว</summary>
            <QuoteMessage product={programName || undefined} />
          </details>
        )}
        <StoreDialogButton name="procurement" className="btn ghost">
          เอกสารเบิกงบ
        </StoreDialogButton>
        <a
          className="btn"
          href={storeInquiryLine}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          เปิด LINE OA {lineId}
        </a>
        <a
          href={lineContact}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          เปิด LINE OA แบบปกติ / เพิ่มเพื่อน
        </a>
        {configured() && <Link href="/support">ส่งคำขอช่วยเหลือในระบบ</Link>}
      </div>
      <p className="muted">
        กรุณางดส่งรหัสผ่าน ข้อมูลบัตร หรือเอกสารของนักเรียนผ่านแชต
      </p>
    </section>
  );
}
