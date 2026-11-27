import { pinSports, productTitle } from "@/lib/marketplace";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/shop";
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { products: all, source } = await getProducts();
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const q = query.toLocaleLowerCase("th");
  const category = typeof sp.category === "string" ? sp.category : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "";
  const cats = [...new Set(all.map((p) => p.category))];
  let products = all.filter(
    (p) =>
      (!q ||
        `${p.name} ${productTitle(p.slug,p.name)} ${p.tagline} ${p.description} ${p.features.join(" ")}`
          .toLocaleLowerCase("th")
          .includes(q)) &&
      (!category || p.category === category),
  );
  if (sort === "asc" || sort === "desc")
    products = products.sort(
      (a, b) => (a.price_cents - b.price_cents) * (sort === "desc" ? -1 : 1),
    );
  else products.sort((a, b) => a.name.localeCompare(b.name, "th"));
  products.sort(pinSports);
  return (
    <section className="section">
      <div className="page-heading">
        <span className="eyebrow">THE SCHOOL SOFTWARE COLLECTION</span>
        <h1>โปรแกรมทั้งหมด</h1>
        <p className="muted">เลือกเครื่องมือที่เหมาะกับโรงเรียนของคุณ</p>
      </div>
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
            <option value="">ตามชื่อ</option>
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
              ? "แผนพัฒนา · ยังไม่เปิดจำหน่าย"
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
    </section>
  );
}
