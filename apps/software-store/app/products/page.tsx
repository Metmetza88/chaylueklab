import Link from "next/link";
import { BookOpen, FileText, Trophy } from "lucide-react";
import { distributor, suppliesHref } from "@/lib/procurement";
import { sportsBundleHref } from "@/lib/sports-bundle";
import { QuoteCartLink } from "@/components/QuoteSelection";
import ProductCard from "@/components/ProductCard";
import { matchesProduct, sportFirst } from "@/lib/marketplace";
import { getProducts } from "@/lib/shop";
import {
  isSchoolPackage,
  schoolPackagePriceLabel,
} from "@/lib/school-packages";
const supplyGroups = [
  {
    name: "อุปกรณ์การเรียน",
    description: "ชุดเครื่องเขียน สมุด และอุปกรณ์สำหรับห้องเรียน",
    icon: BookOpen,
  },
  {
    name: "กระดาษ A4 และพัสดุสำนักงาน",
    description: "กระดาษถ่ายเอกสาร แฟ้ม และของใช้สำนักงาน",
    icon: FileText,
  },
  {
    name: "อุปกรณ์กีฬาสี",
    description: "แจ้งรายการอุปกรณ์และขอประเมินร่วมกับระบบ MET Sport ได้",
    icon: Trophy,
  },
];

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supplies = (sp.section ?? sp.collection) === "supplies";
  const { products: all, source } = await getProducts();
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const sort = sp.sort === "name" ? "name" : "";
  const packages = all.filter((p) => isSchoolPackage(p.slug));
  const cats = [...new Set(packages.map((p) => p.category))];
  const products = packages
    .filter(
      (p) => matchesProduct(p, query) && (!category || p.category === category),
    )
    .sort(
      (a, b) =>
        sportFirst(a, b) ||
        (sort === "name" ? a.name.localeCompare(b.name, "th") : 0),
    );
  return (
    <section className="section market-catalog">
      <div className="page-heading">
        <span className="eyebrow">THE SCHOOL SOFTWARE COLLECTION</span>
        <h1>{supplies ? "อุปกรณ์โรงเรียน" : "แพ็กเกจซอฟต์แวร์โรงเรียน"}</h1>
        <p className="muted">
          {supplies
            ? "ขอราคาตามรายการและจำนวนที่โรงเรียนต้องการ"
            : `ทดลองด้วยข้อมูลจำลอง แล้วขอประเมินแพ็กเกจประมาณ ${schoolPackagePriceLabel} ต่อระบบ`}
        </p>
      </div>
      <QuoteCartLink />
      <nav className="market-catalog-tabs" aria-label="ประเภทสินค้า">
        <Link href="/products" aria-current={!supplies ? "page" : undefined}>
          ซอฟต์แวร์โรงเรียน
        </Link>
        <Link
          href="/products?section=supplies"
          aria-current={supplies ? "page" : undefined}
        >
          อุปกรณ์การเรียน &amp; พัสดุสำนักงาน
        </Link>
      </nav>
      {supplies ? (
        <section aria-labelledby="market-supplies-title">
          <h2 id="market-supplies-title">อุปกรณ์การเรียนและพัสดุสำนักงาน</h2>
          <p className="muted">
            ติดต่อ {distributor} เพื่อเช็กสต๊อก ราคา
            และขอใบเสนอราคาตามรายการของโรงเรียน
          </p>
          <div className="product-grid">
            {supplyGroups.map(({ name, description, icon: Icon }) => (
              <article className="panel market-supply-card" key={name}>
                <Icon size={24} aria-hidden="true" />
                <h3>{name}</h3>
                <p>{description}</p>
                <div className="market-links">
                  <Link
                    className="market-primary"
                    href={`/contact?program=${encodeURIComponent(name)}#quotation`}
                  >
                    ขอใบเสนอราคา
                  </Link>
                  {name === "อุปกรณ์กีฬาสี" && (
                    <Link href={sportsBundleHref}>ขอราคาพร้อม MET Sport</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p>
            <a className="btn ghost" href={suppliesHref}>
              ดูหน้าร้าน {distributor}
            </a>
          </p>
        </section>
      ) : (
        <>
          <form className="filters">
            <label className="search-field">
              ค้นหาโปรแกรม
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="ค้นหาชื่อโปรแกรม หรืองานที่ต้องการ…"
                maxLength={100}
              />
            </label>
            <label>
              หมวดหมู่
              <select name="category" defaultValue={category}>
                <option value="">ทุกหมวดหมู่</option>
                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              เรียงลำดับ
              <select name="sort" defaultValue={sort}>
                <option value="">แนะนำก่อน</option>
                <option value="name">ตามชื่อ (ก–ฮ)</option>
              </select>
            </label>
            <button className="btn">ค้นหา</button>
          </form>
          <div className="row spaced results">
            <p>{products.length} โปรแกรม</p>
            <span className="muted">
              {source === "database"
                ? "แคตตาล็อกจากฐานข้อมูล"
                : source === "roadmap"
                  ? "ขอประเมินก่อนติดตั้ง · เดโมใช้ข้อมูลจำลอง"
                  : "โหลดข้อมูลไม่สำเร็จ"}
            </span>
          </div>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="panel">ไม่พบแพ็กเกจที่ตรงกับการค้นหา</p>
          )}
        </>
      )}
    </section>
  );
}
