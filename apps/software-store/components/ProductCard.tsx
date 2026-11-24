import Link from "next/link";
import {
  ArrowUpRight,
  GraduationCap,
  Globe,
  CalendarDays,
  ClipboardList,
  BookOpen,
  Layers3,
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
  ];
  const n = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  const Icon = Icons[n];
  return (
    <div className={`product-art art-${n} ${large ? "large" : ""}`}>
      <div className="art-orbit" />
      <div className="art-orbit two" />
      <div className="art-symbol">
        <Icon size={large ? 64 : 40} strokeWidth={1.3} />
      </div>
      <span className="art-caption">WORAMET / SCHOOL SYSTEMS</span>
      <span className="art-grid" />
    </div>
  );
}
export default function ProductCard({ p }: { p: Product }) {
  return (
    <article className="product-card">
      <Link href={`/products/${p.slug}`} aria-label={`รายละเอียด ${p.name}`}>
        <ProductArt slug={p.slug} />
      </Link>
      <div className="product-content">
        <div className="row spaced">
          <span className="category-label">{p.category}</span>
          <span className={`status ${p.status === "ready" ? "ready" : ""}`}>
            {p.status === "ready" ? "พร้อมจำหน่าย" : "Coming Soon"}
          </span>
        </div>
        <h3>
          <Link href={`/products/${p.slug}`}>{p.name}</Link>
        </h3>
        <p>{p.tagline}</p>
        <div className="product-bottom">
          <span>
            <small>ราคา{p.status === "ready" ? "" : "เป้าหมาย"}</small>
            <strong>{baht(p.price_cents)}</strong>
          </span>
          <Link
            className="icon-button"
            href={`/products/${p.slug}`}
            aria-label={`ดู ${p.name}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
      </div>
    </article>
  );
}
