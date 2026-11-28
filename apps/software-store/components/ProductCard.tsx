import Link from "next/link";
import ProductPreview from "./ProductPreview";
import { storeOffer } from "@/lib/store-offers";
import { quoteHref } from "@/lib/marketplace";
import ProductQuote from "./ProductQuote";
import LiveDemoTrigger from "./LiveDemoTrigger";
import { schoolPackage } from "@/lib/quote";
import { AddToQuote } from "./QuoteSelection";
import { sportSlug, sportTitle } from "@/lib/marketplace";
import { productDemos } from "@/lib/product-demos";
import { ArrowUpRight, Monitor } from "lucide-react";
import { type Product } from "@/lib/shop";
export default function ProductCard({ p }: { p: Product }) {
  const preview = productDemos.find((demo) => demo.slug === p.slug);
  const sport = p.slug === sportSlug;
  const title = sport ? sportTitle : p.name;
  const offer = storeOffer(p.status);
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
          <span>
            <Monitor size={15} aria-hidden="true" /> ข้อมูลสมมติในเดโม
          </span>
          <small>{preview ? "Cloud Web App" : "แดชบอร์ดทดลอง"}</small>
        </div>
        <div className="product-bottom">
          <span>
            <small>{schoolPackage.label}</small>
            <strong>{schoolPackage.price}</strong>
          </span>
          <Link
            className="icon-button"
            href={`/products/${p.slug}`}
            aria-label={`ดู ${p.name}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
        <div className="market-links market-card-demo">
          <LiveDemoTrigger slug={p.slug} name={p.name} tagline={p.tagline} />
          <Link className="market-primary" href={quoteHref(p.slug)}>
            ขอใบเสนอราคา
          </Link>
        </div>
        <AddToQuote slug={p.slug} />
        <ProductQuote
          slug={p.slug}
          name={title}
          description={p.description}
          features={p.features}
          offer={offer}
          sport={sport}
        />
      </div>
    </article>
  );
}
