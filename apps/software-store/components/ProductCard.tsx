import Link from "next/link";
import ProductPreview from "./ProductPreview";
import { storeOffer } from "@/lib/store-offers";
import { quoteHref, sportSlug, sportTitle } from "@/lib/marketplace";
import {
  isSchoolPackage,
  schoolPackagePriceLabel,
} from "@/lib/school-packages";
import ProductQuote from "./ProductQuote";
import { AddToQuote } from "./QuoteSelection";
import { productDemos } from "@/lib/product-demos";
import { ArrowUpRight, Monitor } from "lucide-react";
import type { Product } from "@/lib/shop";

export default function ProductCard({ p }: { p: Product }) {
  const preview = productDemos.find((demo) => demo.slug === p.slug);
  const sport = p.slug === sportSlug;
  const title = sport ? sportTitle : p.name;
  const schoolPackage = isSchoolPackage(p.slug);
  const offer = storeOffer(p.slug, p.status);
  const badge = schoolPackage
    ? "เปิดรับประเมินงาน"
    : offer.kind === "ready"
      ? "ติดต่อเพื่อเช็กความพร้อม"
      : offer.label;

  return (
    <article
      className={"product-card market-card" + (sport ? " market-featured" : "")}
      data-product-state={p.status}
      data-offer={schoolPackage ? "order" : offer.kind}
      data-product-slug={p.slug}
    >
      <Link href={`/products/${p.slug}`} aria-label={`รายละเอียด ${p.name}`}>
        <ProductPreview product={p} />
      </Link>
      <div className="product-content">
        <div className="row spaced">
          <span className="category-label">{p.category}</span>
          <span
            className={`status market-offer-${schoolPackage ? "order" : offer.kind}`}
          >
            {badge}
          </span>
        </div>
        <h3>
          <Link href={`/products/${p.slug}`}>{title}</Link>
        </h3>
        <p>{sport ? `${p.name} · ${p.tagline}` : p.tagline}</p>
        <div className="market-card-meta">
          <span>
            <Monitor size={15} aria-hidden="true" />{" "}
            {preview ? "เดโมใช้ข้อมูลสมมติ" : "แสดงแนวทางการใช้งาน"}
          </span>
          <small>{preview ? "เดโมบนเว็บ" : "ซอฟต์แวร์โรงเรียน"}</small>
        </div>
        <div className="product-bottom school-package-card-bottom">
          <span>
            <small>
              {schoolPackage
                ? "งบประเมินต่อระบบ"
                : "สอบถามความพร้อมก่อนจัดซื้อ"}
            </small>
            <strong>
              {schoolPackage ? schoolPackagePriceLabel : "ติดต่อประเมินงาน"}
            </strong>
          </span>
          <Link
            className="icon-button"
            href={`/products/${p.slug}`}
            aria-label={`ดู ${p.name}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
        {preview && (
          <div className="market-links market-card-demo">
            <Link className="btn ghost" href={`/demo/${p.slug}`}>
              ทดลองดูตัวอย่าง (Demo)
            </Link>
            {schoolPackage && (
              <Link className="btn ghost" href={quoteHref(p.slug)}>
                ขอใบเสนอราคา
              </Link>
            )}
          </div>
        )}
        {schoolPackage && <AddToQuote slug={p.slug} />}
        <ProductQuote
          slug={p.slug}
          name={title}
          hasDemo={Boolean(preview)}
          description={p.description}
          features={p.features}
          sport={sport}
        />
      </div>
    </article>
  );
}
