import Link from "next/link";
import Image from "next/image";
import ProductPreview from "./ProductPreview";
import ProductQuote from "./ProductQuote";
import { productOffer, sportSlug, sportTitle } from "@/lib/marketplace";
import { productDemos } from "@/lib/product-demos";
import { ArrowUpRight, School } from "lucide-react";
import { type Product, baht } from "@/lib/shop";

export default function ProductCard({ p }: { p: Product }) {
  const preview = productDemos.find((demo) => demo.slug === p.slug);
  const sport = p.slug === sportSlug;
  const title = sport ? sportTitle : p.name;
  const offer = productOffer(p);
  const ready = offer === "ready";
  const price = baht(p.price_cents);
  return (
    <article
      className={"product-card market-card" + (sport ? " market-featured" : "")}
      data-product-state={p.status}
      data-product-slug={p.slug}
    >
      <Link href={`/products/${p.slug}`} aria-label={`รายละเอียด ${p.name}`}>
        <div
          className={`market-preview ${preview ? "" : "store-concept-preview"}`}
        >
          {preview ? (
            <Image
              src={preview.preview}
              alt={preview.previewAlt}
              fill
              sizes="(max-width: 600px) 90vw, (max-width: 950px) 46vw, 400px"
            />
          ) : (
            <ProductPreview product={p} />
          )}
          <span className="market-ribbon">
            {sport
              ? "แนะนำสำหรับงบโครงการ"
              : preview
                ? "มีหน้าจอเดโม"
                : "หน้าจอจำลอง"}
          </span>
          {sport && <small className="market-sample">ข้อมูลตัวอย่าง</small>}
        </div>
      </Link>
      <div className="product-content">
        <div className="row spaced">
          <span className="category-label">{p.category}</span>
          <span className={`status ${offer !== "roadmap" ? "ready" : ""}`}>
            {ready
              ? "พร้อมใช้งาน"
              : offer === "school-order"
                ? "เปิดรับออเดอร์"
                : "แผนพัฒนา"}
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
          <small>{preview ? "มีเดโมออนไลน์" : "ภาพจำลองแนวคิด"}</small>
        </div>
        <div className="product-bottom">
          <span>
            <small>{ready ? "ราคาเริ่มต้น" : "ราคาเป้าหมาย"}</small>
            <strong>{price}</strong>
          </span>
          <Link
            className="icon-button"
            href={`/products/${p.slug}`}
            aria-label={`ดู ${p.name}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
        <div className="market-card-actions">
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
          {preview && (
            <Link className="btn ghost" href={`/demo/${p.slug}`}>
              ทดลองดูตัวอย่าง (Demo)
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
