import Link from "next/link";
import Image from "next/image";
import { School } from "lucide-react";
import { productTitle, SPORTS_SLUG } from "@/lib/marketplace";
import { ProductQuote } from "./MarketDialogs";
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
      <span className="art-product-name" aria-hidden="true">{slug.replace(/^met-/, "").replaceAll("-", " ")}</span>
      <div className="art-symbol">
        <Icon size={large ? 64 : 40} strokeWidth={1.3} />
      </div>
      <span className="art-caption">WORAMET / SCHOOL SYSTEMS</span>
      <span className="art-grid" />
    </div>
  );
}
const images: Record<string,string> = {
  [SPORTS_SLUG]:"/art/met-sport-market.svg",
  "met-admission":"/screenshots/met-admission-dashboard.png",
  "met-school-pro":"/screenshots/met-school-pro-site.png",
};
const publicDemos=new Set(["met-admission","met-school-pro","met-attendance"]);
export default function ProductCard({ p }: { p: Product }) {
  const featured=p.slug===SPORTS_SLUG;
  const title=productTitle(p.slug,p.name);
  const price=baht(p.price_cents);
  const ready=p.status==="ready";
  const image=Object.hasOwn(images,p.slug)?images[p.slug]:undefined;
  return (
    <article className="product-card market-card" data-product-state={p.status} data-market-slug={p.slug}>
      <Link className="market-preview" href={`/products/${p.slug}`} aria-label={`รายละเอียด ${p.name}`}>
        {image?<Image src={image} alt={featured?"ภาพแนวคิดแดชบอร์ด MET Sport":`หน้าจอตัวอย่าง ${title}`} fill sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 400px" unoptimized/>:
          <div className="market-concept" aria-hidden="true"><div className="market-concept-bar">● ● ● <b>{p.name}</b></div><div className="market-concept-body"><div className="market-concept-rail">▣<br/>☰<br/>▤</div><div className="market-concept-main"><strong>{p.category}</strong><div>{p.features.slice(0,3).map((feature)=><span key={feature}>{feature}</span>)}</div><i/><i/><i/></div></div></div>}
        <span className="market-ribbon">{featured?"ไฮไลต์ · กีฬาสี":ready?"พร้อมจำหน่าย":"แผนพัฒนา"}</span>
        <span className="market-preview-note">{image&&!featured?"หน้าจอตัวอย่าง":"ภาพแนวคิด"}</span>
      </Link>
      <div className="product-content">
        <div className="row spaced"><span className="category-label">{p.category}</span><span className={`status ${ready?"ready":""}`}>{ready?"พร้อมจำหน่าย":"Coming Soon"}</span></div>
        <h3><Link href={`/products/${p.slug}`}>{title}</Link></h3>
        <p>{p.tagline}</p>
        <div className="market-card-meta"><span><School size={16}/> ยังไม่เผยแพร่ยอดโรงเรียน</span><span>{publicDemos.has(p.slug)?"Cloud Web App · เดโม":ready?"ซอฟต์แวร์โรงเรียน":"ต้นแบบซอฟต์แวร์"}</span></div>
        <div className="product-bottom">
          <span><small>{ready?"ราคา":"ราคาเป้าหมาย"}</small><strong>{price}</strong></span>
          <Link className="icon-button" href={`/products/${p.slug}`} aria-label={`ดู ${p.name}`}><ArrowUpRight size={21}/></Link>
        </div>
        <ProductQuote slug={p.slug} name={title} description={p.description} features={p.features} price={price} ready={ready}/>
      </div>
    </article>
  );
}
