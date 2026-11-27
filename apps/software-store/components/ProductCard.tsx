import Link from "next/link";
import Image from "next/image";
import { productConcept, productDisplay } from "@/lib/product-display";
import ProductQuote from "./ProductQuote";
import { productDemos } from "@/lib/product-demos";
import {
  ArrowUpRight,
  GraduationCap,
  Globe,
  CalendarDays,
  ClipboardList,
  BookOpen,
  Layers3,
  School,
} from "lucide-react";
import { type Product, baht } from "@/lib/shop";
export function ProductArt({
  slug,
  large = false,
}: {
  slug: string;
  large?: boolean;
}) {
  const Icons = [
    GraduationCap,
    Globe,
    CalendarDays,
    ClipboardList,
    BookOpen,
    Layers3,
    School,
  ];
  const n = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  const Icon = Icons[n];
  return (
    <div className={`product-art art-${n} ${large ? "large" : ""}`}>
      <div className="art-orbit" />
      <div className="art-orbit two" />
      <span className="art-product-name" aria-hidden="true">
        {slug.replace(/^met-/, "").replaceAll("-", " ")}
      </span>
      <div className="art-symbol">
        <Icon size={large ? 64 : 40} strokeWidth={1.3} />
      </div>
      <span className="art-caption">WORAMET / SCHOOL SYSTEMS</span>
      <span className="art-grid" />
    </div>
  );
}
export default function ProductCard({ p }: { p: Product }) {
  const preview = productDemos.find((demo) => demo.slug === p.slug);
  const concept = productConcept(p.slug);
  const status = productDisplay(p.slug, p.status);
  const sport = p.slug === "met-sport";
  const ready = p.status === "ready";
  const price = baht(p.price_cents);
  return (
    <article
      className={"product-card market-card" + (sport ? " market-featured" : "")}
      data-product-state={p.status}
      data-product-slug={p.slug}
    >
      <Link href={`/products/${p.slug}`} aria-label={`รายละเอียด ${p.name}`}>
        <div className="market-preview">
          {preview ? (
            <Image
              src={preview.preview}
              alt={preview.previewAlt}
              fill
              unoptimized
              sizes="(max-width: 600px) 100vw, (max-width: 950px) 50vw, 33vw"
            />
          ) : concept ? (
            <Image
              src={concept}
              alt={`ภาพแนวคิดหน้าจอ ${p.name} ไม่ใช่หน้าจอระบบจริง`}
              fill
              unoptimized
              sizes="(max-width: 600px) 100vw, (max-width: 950px) 50vw, 33vw"
            />
          ) : (
            <div className="market-mock" aria-hidden="true">
              <div className="market-mock-bar">
                <span /> <strong>{p.name}</strong>
              </div>
              <div className="market-mock-body">
                <b>{sport ? "สรุปการแข่งขัน" : p.tagline}</b>
                <div className="market-mock-tiles">
                  {sport
                    ? ["ทีมสีฟ้า", "ทีมสีทอง", "ทีมสีเขียว"].map(
                        (team, index) => (
                          <div key={team}>
                            {team}
                            <strong>{[86, 75, 62][index]}</strong>
                          </div>
                        ),
                      )
                    : p.features.slice(0, 3).map((feature) => (
                        <div key={feature}>
                          {feature}
                          <span />
                        </div>
                      ))}
                </div>
              </div>
            </div>
          )}
          <span className="market-ribbon">
            {sport
              ? "ภาพแนวคิด · กีฬาสี"
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
          <span className={`status ${status.tone}`}>{status.label}</span>
        </div>
        <h3>
          <Link href={`/products/${p.slug}`}>{p.name}</Link>
        </h3>
        <p>{p.tagline}</p>
        {sport && (
          <p className="market-sport-label">
            ระบบบริหารจัดการแข่งขันกีฬาสีภายในโรงเรียน
          </p>
        )}
        <div className="market-card-meta">
          <span title="ยังไม่มีจำนวนโรงเรียนที่ยืนยัน">
            <School size={15} aria-hidden="true" /> — โรงเรียน
          </span>
          <small>{preview ? "Web App" : "ซอฟต์แวร์โรงเรียน"}</small>
        </div>
        <div className="product-bottom">
          <span>
            <small>ราคา{p.status === "ready" ? "" : "เป้าหมาย"}</small>
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
        <ProductQuote
          name={p.name}
          description={p.description}
          features={p.features}
          price={price}
          ready={ready}
          sport={sport}
        />
        {preview ? (
          <Link className="btn ghost market-demo-cta" href={`/demo/${p.slug}`}>
            ทดลองดูตัวอย่าง (Demo)
          </Link>
        ) : sport && concept ? (
          <Link
            className="btn ghost market-demo-cta"
            href="/products/met-sport#concept"
          >
            ดูตัวอย่างหน้าจอ
          </Link>
        ) : null}
      </div>
    </article>
  );
}
