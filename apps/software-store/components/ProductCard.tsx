import Link from "next/link";
import ProductPreview from "./ProductPreview";
import { storeOffer } from "@/lib/store-offers";
import { quoteHref } from "@/lib/marketplace";
import ProductQuote from "./ProductQuote";
import { AddToQuote } from "./QuoteSelection";
import { sportSlug, sportTitle } from "@/lib/marketplace";
import { productDemos } from "@/lib/product-demos";
import { ArrowUpRight, School } from "lucide-react";
import { type Product, baht } from "@/lib/shop";
export default function ProductCard({ p }: { p: Product }) {
  const preview = productDemos.find((demo) => demo.slug === p.slug);
  const sport = p.slug === sportSlug;
  const title = sport ? sportTitle : p.name;
  const offer = storeOffer(p.slug, p.status);
  const price = baht(p.price_cents);
  return (
    <article
      className={"product-card market-card" + (sport ? " market-featured" : "")}
      data-product-state={p.status}
      data-offer={offer.kind}
      data-product-slug={p.slug}
    >
      <Link href={`/products/${p.slug}`} aria-label={`รายละเอียด ${p.name}`}>
        <ProductPreview product={p} />
      </Link>
      <div className="product-content">
        <div className="row spaced">
          <span className="category-label">{p.category}</span>
          <span className={`status market-offer-${offer.kind}`}>
            {offer.label}
          </span>
        </div>
        <h3>
          <Link href={`/products/${p.slug}`}>{title}</Link>
        </h3>
        <p>{sport ? `${p.name} · ${p.tagline}` : p.tagline}</p>
        <div className="market-card-meta">
          <span title="ยังไม่มีจำนวนโรงเรียนที่ยืนยัน">
            <School size={15} aria-hidden="true" /> โรงเรียนที่ใช้ · ยังไม่ระบุ
          </span>
          <small>{preview ? "Cloud Web App" : "Web App · แผนพัฒนา"}</small>
        </div>
        <div className="product-bottom">
          <span>
            <small>{offer.priceLabel}</small>
            <strong>{offer.kind === "order" ? "ขอใบเสนอราคา" : price}</strong>
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
            <Link className="btn ghost" href={quoteHref(p.slug)}>
              ขอใบเสนอราคา
            </Link>
          </div>
        )}
        <AddToQuote slug={p.slug} />
        <ProductQuote
          slug={p.slug}
          name={title}
          hasDemo={Boolean(preview)}
          description={p.description}
          features={p.features}
          price={price}
          offer={offer}
          sport={sport}
        />
      </div>
    </article>
  );
}
