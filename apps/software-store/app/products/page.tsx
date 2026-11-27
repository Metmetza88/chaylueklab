import Link from "next/link";
import { BookOpen, FileText, Trophy } from "lucide-react";
import { distributor, suppliesHref } from "@/lib/procurement";
import { quoteHref } from "@/lib/marketplace";
import { QuoteCartLink } from "@/components/QuoteSelection";
import ProductCard from "@/components/ProductCard";
import { matchesProduct, sportFirst } from "@/lib/marketplace";
import { getProducts } from "@/lib/shop";
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
  const supplies = sp.section === "supplies";
  const { products: all, source } = await getProducts();
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "";
  const cats = [...new Set(all.map((p) => p.category))];
  const products = all
    .filter(
      (p) => matchesProduct(p, query) && (!category || p.category === category),
    )
    .sort(
      (a, b) =>
        sportFirst(a, b) ||
        (sort === "asc" || sort === "desc"
          ? (a.price_cents - b.price_cents) * (sort === "desc" ? -1 : 1)
          : a.name.localeCompare(b.name, "th")),
    );
  return (
    <section className="section market-catalog">
      <div className="page-heading">
        <span className="eyebrow">THE SCHOOL SOFTWARE COLLECTION</span>
        <h1>โปรแกรมทั้งหมด</h1>
        <p className="muted">เลือกเครื่องมือที่เหมาะกับโรงเรียนของคุณ</p>
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
                    <Link href={quoteHref("met-sport")}>
                      ขอราคาพร้อม MET Sport
                    </Link>
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
                <option value="">แนะนำก่อน · ตามชื่อ</option>
                <option value="asc">ราคาน้อยไปมาก</option>
                <option value="desc">ราคามากไปน้อย</option>
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
                  ? "สถานะการสั่งซื้อระบุในแต่ละโปรแกรม"
                  : "โหลดข้อมูลไม่สำเร็จ"}
            </span>
          </div>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="panel">ไม่พบโปรแกรมที่ตรงกับการค้นหา</p>
          )}
        </>
      )}
    </section>
  );
}
