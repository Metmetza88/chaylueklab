import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  lineContact,
  lineId,
  matchesProduct,
  sportFirst,
} from "@/lib/marketplace";
import { catalogPrice, getProducts, type Product } from "@/lib/shop";
const supplies = [
  [
    "ชุดอุปกรณ์การเรียน",
    "สมุด ดินสอ ปากกา และชุดเครื่องเขียนตามจำนวนที่โรงเรียนต้องการ",
  ],
  [
    "กระดาษ A4 และพัสดุสำนักงาน",
    "กระดาษถ่ายเอกสาร แฟ้ม และวัสดุสิ้นเปลืองสำหรับสำนักงาน",
  ],
  [
    "อุปกรณ์กีฬาสี",
    "แจ้งรายการและจำนวนที่ต้องการ หรือติดต่อขอใบเสนอราคารวมกับระบบ MET Sport",
  ],
];

function comparePrices(a: Product, b: Product, sort: string) {
  const first = catalogPrice(a).cents;
  const second = catalogPrice(b).cents;
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return (first - second) * (sort === "desc" ? -1 : 1);
}

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { products: all, source } = await getProducts();
  const showSupplies = sp.tab === "supplies";
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
          ? comparePrices(a, b, sort)
          : a.name.localeCompare(b.name, "th")),
    );
  return (
    <section className="section">
      <div className="page-heading">
        <span className="eyebrow">THE SCHOOL SOFTWARE COLLECTION</span>
        <h1>
          {showSupplies ? "อุปกรณ์การเรียนและพัสดุสำนักงาน" : "โปรแกรมทั้งหมด"}
        </h1>
        <p className="muted">
          {showSupplies
            ? "ร้าน พ.สมนึก 2&3 · สอบถามราคาและกำหนดส่งตามรายการ"
            : "เลือกเครื่องมือที่เหมาะกับโรงเรียนของคุณ"}
        </p>
      </div>
      <nav className="store-catalog-tabs" aria-label="หมวดสินค้า">
        <Link
          className="btn ghost"
          href="/products"
          aria-current={showSupplies ? undefined : "page"}
        >
          ซอฟต์แวร์โรงเรียน
        </Link>
        <Link
          className="btn ghost"
          href="/products?tab=supplies"
          aria-current={showSupplies ? "page" : undefined}
        >
          อุปกรณ์การเรียน &amp; พัสดุสำนักงาน (ร้าน พ.สมนึก 2&3)
        </Link>
      </nav>
      {showSupplies ? (
        <div className="info-grid">
          {supplies.map(([name, description]) => (
            <article className="panel stack" key={name}>
              <h2>{name}</h2>
              <p>{description}</p>
              <Link
                className="market-primary"
                href={`/contact?program=${encodeURIComponent(name)}#quotation`}
              >
                ขอใบเสนอราคา
              </Link>
              <a href={lineContact}>สอบถามทาง LINE {lineId}</a>
            </article>
          ))}
        </div>
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
                  ? "ตรวจสถานะและขอใบเสนอราคาจากการ์ดโปรแกรม"
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
